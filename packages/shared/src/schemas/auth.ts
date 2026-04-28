import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

const e164PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number in E.164 format (e.g. +14155552671).");

export const IdentifierSchema = z
  .object({
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
  })
  .refine((v) => !!v.email || !!v.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
  });

export type Identifier = z.infer<typeof IdentifierSchema>;

export const SignupSchema = IdentifierSchema;
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z
  .object({
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
    password: z.string().min(1, "Enter your password."),
  })
  .refine((v) => !!v.email || !!v.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
  });
export type LoginInput = z.infer<typeof LoginSchema>;

export const MagicLinkRequestSchema = IdentifierSchema;
export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>;

export const VerifySchema = z
  .object({
    token: z.string().trim().min(1).optional(),
    code: z.string().trim().regex(/^\d{6}$/).optional(),
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
  })
  .refine((v) => !!v.token || !!v.code, {
    message: "Provide a magic link token or OTP code.",
    path: ["token"],
  });
export type VerifyInput = z.infer<typeof VerifySchema>;

export const ForgotPasswordSchema = IdentifierSchema;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const SetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
});
export type SetPasswordInput = z.infer<typeof SetPasswordSchema>;
