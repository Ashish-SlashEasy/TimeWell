"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetPasswordSchema = exports.ChangePasswordSchema = exports.ResetPasswordSchema = exports.ForgotPasswordSchema = exports.VerifySchema = exports.MagicLinkRequestSchema = exports.LoginSchema = exports.SignupSchema = exports.IdentifierSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z.string().trim().toLowerCase().email("Enter a valid email address.");
const e164PhoneSchema = zod_1.z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number in E.164 format (e.g. +14155552671).");
exports.IdentifierSchema = zod_1.z
    .object({
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
})
    .refine((v) => !!v.email || !!v.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
});
exports.SignupSchema = exports.IdentifierSchema;
exports.LoginSchema = zod_1.z
    .object({
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
    password: zod_1.z.string().min(1, "Enter your password."),
})
    .refine((v) => !!v.email || !!v.phone, {
    message: "Provide either an email or phone number.",
    path: ["email"],
});
exports.MagicLinkRequestSchema = exports.IdentifierSchema;
exports.VerifySchema = zod_1.z
    .object({
    token: zod_1.z.string().trim().min(1).optional(),
    code: zod_1.z.string().trim().regex(/^\d{6}$/).optional(),
    email: emailSchema.optional(),
    phone: e164PhoneSchema.optional(),
})
    .refine((v) => !!v.token || !!v.code, {
    message: "Provide a magic link token or OTP code.",
    path: ["token"],
});
exports.ForgotPasswordSchema = exports.IdentifierSchema;
exports.ResetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().trim().min(1, "Reset token is required."),
    newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters.").max(128),
});
exports.ChangePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, "Enter your current password."),
    newPassword: zod_1.z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirmPassword: zod_1.z.string().min(1, "Confirm your new password."),
})
    .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
});
exports.SetPasswordSchema = zod_1.z.object({
    password: zod_1.z.string().min(8, "Password must be at least 8 characters.").max(128),
});
//# sourceMappingURL=auth.js.map