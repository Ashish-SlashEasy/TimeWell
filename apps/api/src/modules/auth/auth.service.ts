import { Types } from "mongoose";
import { env } from "../../config/env";
import { AuthToken, AuthTokenPurpose, User, UserDoc } from "../../models";
import { AppError } from "../../utils/AppError";
import { comparePassword, hashPassword } from "../../utils/password";
import { signAccessToken, signRefreshToken } from "../../utils/jwt";
import {
  buildEmailChangeVerifyEmail,
  buildMagicLinkEmail,
  buildResetPasswordEmail,
  sendEmail,
} from "../../utils/email";
import { buildOtpSms, sendSms } from "../../utils/sms";
import { generateMagicLinkToken, generateOtpCode, newJti, sha256 } from "../../utils/tokens";

const MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
const RESET_TTL_MS = 15 * 60 * 1000;
const LOCK_AFTER_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export type Identifier = { email?: string; phone?: string };

interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Section 3: signup. Single identifier (email OR phone).
   * If identifier exists, silently send a fresh magic link / OTP — never leak existence.
   */
  async signup(ident: Identifier): Promise<void> {
    const channel = this.requireChannel(ident);
    const identifier = channel === "email" ? ident.email! : ident.phone!;

    // Find or create user (unverified shell). Either branch issues the same response.
    let user = await this.findByIdentifier(ident);
    if (!user) {
      const doc: Partial<UserDoc> = { role: "user" };
      if (channel === "email") doc.email = identifier;
      else doc.phone = identifier;
      user = await User.create(doc);
    }

    await this.issueMagicLinkOrOtp(user, channel, identifier);
  }

  /**
   * Re-issues a magic link / OTP without requiring sign-up.
   * Same no-enumeration semantics: if no user exists, create the shell.
   */
  async requestMagicLink(ident: Identifier): Promise<void> {
    return this.signup(ident);
  }

  async verify(input: {
    token?: string;
    code?: string;
    email?: string;
    phone?: string;
  }): Promise<IssuedTokens & { userId: string; isNew: boolean }> {
    let tokenDoc;
    let isOtp = false;

    if (input.token) {
      const tokenHash = sha256(input.token);
      tokenDoc = await AuthToken.findOne({
        tokenHash,
        purpose: "magic_link",
        consumedAt: null,
      });
    } else if (input.code) {
      const channel = input.email ? "email" : input.phone ? "phone" : null;
      if (!channel) {
        throw new AppError({
          code: "IDENTIFIER_REQUIRED",
          statusCode: 400,
        });
      }
      const identifier = (channel === "email" ? input.email : input.phone)!.toLowerCase();
      const codeHash = sha256(input.code);
      tokenDoc = await AuthToken.findOne({
        tokenHash: codeHash,
        purpose: "otp",
        channel,
        identifier,
        consumedAt: null,
      });
      isOtp = true;
    } else {
      throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
    }

    if (!tokenDoc) {
      throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
    }
    if (tokenDoc.expiresAt.getTime() < Date.now()) {
      throw new AppError({ code: "TOKEN_EXPIRED", statusCode: 400 });
    }
    if (tokenDoc.consumedAt) {
      throw new AppError({ code: "TOKEN_CONSUMED", statusCode: 400 });
    }

    const user = await User.findById(tokenDoc.userId);
    if (!user) throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });

    const wasUnverified =
      tokenDoc.channel === "email" ? !user.emailVerified : !user.phoneVerified;

    if (tokenDoc.channel === "email") user.emailVerified = true;
    else user.phoneVerified = true;
    await user.save();

    tokenDoc.consumedAt = new Date();
    await tokenDoc.save();

    // Invalidate all other outstanding magic-link / OTP tokens for this user
    await AuthToken.updateMany(
      {
        userId: user._id,
        purpose: { $in: ["magic_link", "otp"] },
        consumedAt: null,
        _id: { $ne: tokenDoc._id },
      },
      { $set: { consumedAt: new Date() } },
    );

    const tokens = this.issueTokens(user);
    void isOtp; // currently unused but kept for future telemetry
    return { ...tokens, userId: user.id, isNew: wasUnverified };
  }

  async login(ident: Identifier, password: string): Promise<IssuedTokens & { userId: string }> {
    const user = await this.findByIdentifierWithSecrets(ident);
    if (!user || !user.passwordHash) {
      // Indistinguishable from "user exists but wrong password"
      throw new AppError({ code: "INVALID_CREDENTIALS", statusCode: 401 });
    }
    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new AppError({ code: "ACCOUNT_LOCKED", statusCode: 423 });
    }

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      if (user.failedLoginAttempts >= LOCK_AFTER_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      throw new AppError({ code: "INVALID_CREDENTIALS", statusCode: 401 });
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    const tokens = this.issueTokens(user);
    return { ...tokens, userId: user.id };
  }

  async refresh(refreshTokenJti: string, userId: string): Promise<IssuedTokens> {
    // refreshTokenJti is verified upstream; we re-issue both tokens.
    const user = await User.findById(userId);
    if (!user) throw AppError.unauthorized();
    return this.issueTokens(user);
  }

  async forgotPassword(ident: Identifier): Promise<void> {
    const user = await this.findByIdentifier(ident);
    if (!user) return; // No-enumeration

    const channel = ident.email ? "email" : "phone";
    const identifier = (ident.email ?? ident.phone)!;
    const { raw, hash } = generateMagicLinkToken();

    await AuthToken.create({
      userId: user._id,
      purpose: "reset",
      tokenHash: hash,
      channel,
      identifier,
      expiresAt: new Date(Date.now() + RESET_TTL_MS),
    });

    if (channel === "email") {
      const link = `${env.WEB_APP_URL}/auth/reset-password?token=${encodeURIComponent(raw)}`;
      await sendEmail(buildResetPasswordEmail(identifier, link));
    } else {
      // Reset by SMS not in scope — magic-link flow covers passwordless phone login.
      // No-op silently.
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = sha256(token);
    const tokenDoc = await AuthToken.findOne({
      tokenHash,
      purpose: "reset",
      consumedAt: null,
    });
    if (!tokenDoc || tokenDoc.expiresAt.getTime() < Date.now()) {
      throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
    }
    const user = await User.findById(tokenDoc.userId).select("+passwordHash");
    if (!user) throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });

    user.passwordHash = await hashPassword(newPassword);
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await user.save();

    tokenDoc.consumedAt = new Date();
    await tokenDoc.save();

    // Invalidate all other reset tokens for this user
    await AuthToken.updateMany(
      { userId: user._id, purpose: "reset", consumedAt: null },
      { $set: { consumedAt: new Date() } },
    );
  }

  async setPassword(userId: string, plain: string): Promise<void> {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw AppError.notFound();
    user.passwordHash = await hashPassword(plain);
    await user.save();
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user || !user.passwordHash) {
      throw new AppError({ code: "CURRENT_PASSWORD_INCORRECT", statusCode: 400 });
    }
    const ok = await comparePassword(currentPassword, user.passwordHash);
    if (!ok) {
      throw new AppError({ code: "CURRENT_PASSWORD_INCORRECT", statusCode: 400 });
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
  }

  // ────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────

  private requireChannel(ident: Identifier): "email" | "phone" {
    if (ident.email) return "email";
    if (ident.phone) return "phone";
    throw new AppError({ code: "IDENTIFIER_REQUIRED", statusCode: 400 });
  }

  private async findByIdentifier(ident: Identifier): Promise<UserDoc | null> {
    if (ident.email) return User.findOne({ email: ident.email.toLowerCase() });
    if (ident.phone) return User.findOne({ phone: ident.phone });
    return null;
  }

  private async findByIdentifierWithSecrets(ident: Identifier): Promise<UserDoc | null> {
    if (ident.email)
      return User.findOne({ email: ident.email.toLowerCase() }).select(
        "+passwordHash +failedLoginAttempts +lockedUntil",
      );
    if (ident.phone)
      return User.findOne({ phone: ident.phone }).select(
        "+passwordHash +failedLoginAttempts +lockedUntil",
      );
    return null;
  }

  private async issueMagicLinkOrOtp(
    user: UserDoc,
    channel: "email" | "phone",
    identifier: string,
  ): Promise<void> {
    if (channel === "email") {
      const { raw, hash } = generateMagicLinkToken();
      await AuthToken.create({
        userId: user._id,
        purpose: "magic_link",
        tokenHash: hash,
        channel,
        identifier,
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      });
      const link = `${env.WEB_APP_URL}/auth/verify?token=${encodeURIComponent(raw)}`;
      await sendEmail(buildMagicLinkEmail(identifier, link));
    } else {
      const { raw, hash } = generateOtpCode();
      await AuthToken.create({
        userId: user._id,
        purpose: "otp",
        tokenHash: hash,
        channel,
        identifier,
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
      });
      await sendSms(buildOtpSms(identifier, raw));
    }
  }

  private issueTokens(user: UserDoc): IssuedTokens {
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = signRefreshToken(user.id, newJti());
    return { accessToken, refreshToken };
  }

  // ────────────────────────────────────────────────────────────
  // Email / phone change flows (used by accounts module)
  // ────────────────────────────────────────────────────────────

  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const normalized = newEmail.toLowerCase();
    const conflict = await User.findOne({ email: normalized, _id: { $ne: userId } });
    if (conflict) {
      // Don't leak — pretend it succeeded. The user just won't get a verify link.
      return;
    }
    const { raw, hash } = generateMagicLinkToken();
    await AuthToken.create({
      userId: new Types.ObjectId(userId),
      purpose: "email_change",
      tokenHash: hash,
      channel: "email",
      identifier: normalized,
      meta: { newEmail: normalized },
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });
    const link = `${env.WEB_APP_URL}/account/confirm-email?token=${encodeURIComponent(raw)}`;
    await sendEmail(buildEmailChangeVerifyEmail(normalized, link));
  }

  async confirmEmailChange(token: string): Promise<void> {
    const tokenHash = sha256(token);
    const tokenDoc = await AuthToken.findOne({
      tokenHash,
      purpose: "email_change",
      consumedAt: null,
    });
    if (!tokenDoc || tokenDoc.expiresAt.getTime() < Date.now()) {
      throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
    }
    const user = await User.findById(tokenDoc.userId);
    if (!user) throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });

    const newEmail = (tokenDoc.meta as { newEmail?: string } | undefined)?.newEmail
      ?? tokenDoc.identifier;
    user.email = newEmail;
    user.emailVerified = true;
    await user.save();

    tokenDoc.consumedAt = new Date();
    await tokenDoc.save();
  }

  async requestPhoneChange(userId: string, newPhone: string): Promise<void> {
    const conflict = await User.findOne({ phone: newPhone, _id: { $ne: userId } });
    if (conflict) return;
    const { raw, hash } = generateOtpCode();
    await AuthToken.create({
      userId: new Types.ObjectId(userId),
      purpose: "phone_change",
      tokenHash: hash,
      channel: "phone",
      identifier: newPhone,
      meta: { newPhone },
      expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
    });
    await sendSms(buildOtpSms(newPhone, raw));
  }

  async confirmPhoneChange(userId: string, code: string): Promise<void> {
    const codeHash = sha256(code);
    const tokenDoc = await AuthToken.findOne({
      userId: new Types.ObjectId(userId),
      purpose: "phone_change",
      tokenHash: codeHash,
      consumedAt: null,
    });
    if (!tokenDoc || tokenDoc.expiresAt.getTime() < Date.now()) {
      throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
    }
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound();
    const newPhone =
      (tokenDoc.meta as { newPhone?: string } | undefined)?.newPhone ?? tokenDoc.identifier;
    user.phone = newPhone;
    user.phoneVerified = true;
    await user.save();
    tokenDoc.consumedAt = new Date();
    await tokenDoc.save();
  }
}

export const authService = new AuthService();

export const REFRESH_COOKIE_NAME = "tw_refresh";

export function refreshCookieOptions() {
  // 7 days in ms — must match JWT_REFRESH_TTL
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return {
    httpOnly: true,
    secure: true,
    sameSite: "none" as const,
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: SEVEN_DAYS_MS,
    path: "/",
  };
}
