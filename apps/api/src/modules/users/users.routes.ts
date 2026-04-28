import { Router } from "express";
import { z } from "zod";
import { ChangePasswordSchema, UpdateProfileSchema } from "@timewell/shared";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import {
  changePasswordController,
  confirmEmailChangeController,
  confirmPhoneChangeController,
  getMeController,
  getQuotaController,
  updateMeController,
} from "./users.controller";

export const usersRouter: Router = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", getMeController);
usersRouter.patch("/me", validate(UpdateProfileSchema), updateMeController);
usersRouter.get("/me/quota", getQuotaController);
usersRouter.post(
  "/me/change-password",
  validate(ChangePasswordSchema),
  changePasswordController,
);
usersRouter.post(
  "/me/confirm-email-change",
  validate(z.object({ token: z.string().min(1) })),
  confirmEmailChangeController,
);
usersRouter.post(
  "/me/confirm-phone-change",
  validate(z.object({ code: z.string().regex(/^\d{6}$/) })),
  confirmPhoneChangeController,
);
