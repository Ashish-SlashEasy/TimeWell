import { Request, Response } from "express";
import { ChangePasswordInput, UpdateProfileInput } from "@timewell/shared";
import { asyncHandler } from "../../utils/asyncHandler";
import { authService } from "../auth/auth.service";
import { usersService } from "./users.service";
import { AppError } from "../../utils/AppError";

function requireUserId(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}

export const getMeController = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const user = await usersService.getProfile(userId);
  res.status(200).json({ data: user });
});

export const getQuotaController = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const quota = await usersService.getQuota(userId);
  res.status(200).json({ data: quota });
});

export const updateMeController = asyncHandler<Request<unknown, unknown, UpdateProfileInput>>(
  async (req, res) => {
    const userId = requireUserId(req);
    const result = await usersService.updateProfile(userId, req.body);
    res.status(200).json({ data: result });
  },
);

export const changePasswordController = asyncHandler<
  Request<unknown, unknown, ChangePasswordInput>
>(async (req, res) => {
  const userId = requireUserId(req);
  await authService.changePassword(userId, req.body.currentPassword, req.body.newPassword);
  res.status(200).json({ data: { ok: true } });
});

export const confirmEmailChangeController = asyncHandler<
  Request<unknown, unknown, { token: string }>
>(async (req, res) => {
  if (!req.body.token) throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
  await authService.confirmEmailChange(req.body.token);
  res.status(200).json({ data: { ok: true } });
});

export const confirmPhoneChangeController = asyncHandler<
  Request<unknown, unknown, { code: string }>
>(async (req, res) => {
  const userId = requireUserId(req);
  if (!req.body.code) throw new AppError({ code: "TOKEN_INVALID", statusCode: 400 });
  await authService.confirmPhoneChange(userId, req.body.code);
  res.status(200).json({ data: { ok: true } });
});
