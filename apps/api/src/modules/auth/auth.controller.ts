import { Request, Response } from "express";
import {
  ForgotPasswordInput,
  IdentifierSchema,
  LoginInput,
  MagicLinkRequestInput,
  ResetPasswordInput,
  SignupInput,
  VerifyInput,
} from "@timewell/shared";
import { AppError } from "../../utils/AppError";
import { verifyRefreshToken } from "../../utils/jwt";
import { asyncHandler } from "../../utils/asyncHandler";
import {
  REFRESH_COOKIE_NAME,
  authService,
  refreshCookieOptions,
} from "./auth.service";

const ACK = { ok: true } as const;

export const signupController = asyncHandler<Request<unknown, unknown, SignupInput>>(
  async (req, res) => {
    await authService.signup({ email: req.body.email, phone: req.body.phone });
    // Same response whether new or existing — Section 3 no-enumeration.
    res.status(202).json({ data: ACK });
  },
);

export const magicLinkController = asyncHandler<Request<unknown, unknown, MagicLinkRequestInput>>(
  async (req, res) => {
    await authService.requestMagicLink({ email: req.body.email, phone: req.body.phone });
    res.status(202).json({ data: ACK });
  },
);

export const verifyController = asyncHandler<Request<unknown, unknown, VerifyInput>>(
  async (req, res) => {
    const result = await authService.verify({
      token: req.body.token,
      code: req.body.code,
      email: req.body.email,
      phone: req.body.phone,
    });
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(200).json({
      data: {
        accessToken: result.accessToken,
        userId: result.userId,
        isNew: result.isNew,
      },
    });
  },
);

export const loginController = asyncHandler<Request<unknown, unknown, LoginInput>>(
  async (req, res) => {
    const result = await authService.login(
      { email: req.body.email, phone: req.body.phone },
      req.body.password,
    );
    res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, refreshCookieOptions());
    res.status(200).json({
      data: { accessToken: result.accessToken, userId: result.userId },
    });
  },
);

export const refreshController = asyncHandler(async (req, res) => {
  const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!cookieToken) throw AppError.unauthorized();
  const payload = verifyRefreshToken(cookieToken);
  const tokens = await authService.refresh(payload.jti, payload.sub);
  res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, refreshCookieOptions());
  res.status(200).json({ data: { accessToken: tokens.accessToken } });
});

export const logoutController = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { ...refreshCookieOptions(), maxAge: 0 });
  res.status(200).json({ data: ACK });
});

export const forgotPasswordController = asyncHandler<
  Request<unknown, unknown, ForgotPasswordInput>
>(async (req, res) => {
  // Validate identifier shape (re-validation isn't strictly needed since route uses validate())
  IdentifierSchema.parse(req.body);
  await authService.forgotPassword({ email: req.body.email, phone: req.body.phone });
  res.status(202).json({ data: ACK });
});

export const resetPasswordController = asyncHandler<
  Request<unknown, unknown, ResetPasswordInput>
>(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(200).json({ data: ACK });
});
