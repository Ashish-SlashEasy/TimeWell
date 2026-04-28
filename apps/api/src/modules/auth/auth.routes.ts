import { Router } from "express";
import {
  ForgotPasswordSchema,
  LoginSchema,
  MagicLinkRequestSchema,
  ResetPasswordSchema,
  SignupSchema,
  VerifySchema,
} from "@timewell/shared";
import { validate } from "../../middleware/validate";
import {
  forgotPasswordRateLimiter,
  loginRateLimiter,
  magicLinkRateLimiter,
  signupRateLimiter,
} from "../../middleware/rateLimit";
import {
  forgotPasswordController,
  loginController,
  logoutController,
  magicLinkController,
  refreshController,
  resetPasswordController,
  signupController,
  verifyController,
} from "./auth.controller";

export const authRouter: Router = Router();

authRouter.post("/signup", signupRateLimiter, validate(SignupSchema), signupController);
authRouter.post("/verify", validate(VerifySchema), verifyController);
authRouter.post("/login", loginRateLimiter, validate(LoginSchema), loginController);
authRouter.post(
  "/magic-link",
  magicLinkRateLimiter,
  validate(MagicLinkRequestSchema),
  magicLinkController,
);
authRouter.post("/refresh", refreshController);
authRouter.post("/logout", logoutController);
authRouter.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  validate(ForgotPasswordSchema),
  forgotPasswordController,
);
authRouter.post("/reset-password", validate(ResetPasswordSchema), resetPasswordController);
