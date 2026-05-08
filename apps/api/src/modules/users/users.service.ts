import { PublicUser } from "@timewell/shared";
import { User, UserDoc } from "../../models";
import { AppError } from "../../utils/AppError";
import { authService } from "../auth/auth.service";

export class UsersService {
  async getProfile(userId: string): Promise<PublicUser> {
    const user = await User.findById(userId).select("+passwordHash");
    if (!user) throw AppError.notFound();
    return this.toPublic(user);
  }

  async getQuota(userId: string): Promise<{ total: number; used: number; remaining: number }> {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound();
    const total = user.purchasedCards;
    const used = user.usedCards;
    return { total, used, remaining: Math.max(0, total - used) };
  }

  /**
   * Update first/last name immediately. Email and phone require verification —
   * they're queued via auth tokens and only commit when the user clicks/enters the code.
   */
  async updateProfile(
    userId: string,
    update: { firstName?: string; lastName?: string; email?: string; phone?: string },
  ): Promise<{ user: PublicUser; emailChangePending: boolean; phoneChangePending: boolean }> {
    const user = await User.findById(userId);
    if (!user) throw AppError.notFound();

    if (typeof update.firstName === "string") user.firstName = update.firstName;
    if (typeof update.lastName === "string") user.lastName = update.lastName;
    await user.save();

    let emailChangePending = false;
    let phoneChangePending = false;

    if (update.email && update.email !== user.email) {
      await authService.requestEmailChange(userId, update.email);
      emailChangePending = true;
    }
    if (update.phone && update.phone !== user.phone) {
      await authService.requestPhoneChange(userId, update.phone);
      phoneChangePending = true;
    }

    return {
      user: this.toPublic(user),
      emailChangePending,
      phoneChangePending,
    };
  }

  toPublic(user: UserDoc): PublicUser {
    return {
      id: user.id,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      role: user.role,
      purchasedCards: user.purchasedCards,
      usedCards: user.usedCards,
      createdAt: user.createdAt.toISOString(),
      hasPassword: !!user.passwordHash,
    };
  }
}

export const usersService = new UsersService();
