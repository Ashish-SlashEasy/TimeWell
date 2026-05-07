import { z } from "zod";
export declare const IdentifierSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>;
export type Identifier = z.infer<typeof IdentifierSchema>;
export declare const SignupSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>;
export type SignupInput = z.infer<typeof SignupSchema>;
export declare const LoginSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
}, {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
}, {
    password: string;
    email?: string | undefined;
    phone?: string | undefined;
}>;
export type LoginInput = z.infer<typeof LoginSchema>;
export declare const MagicLinkRequestSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>;
export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>;
export declare const VerifySchema: z.ZodEffects<z.ZodObject<{
    token: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    code?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    token?: string | undefined;
}, {
    code?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    token?: string | undefined;
}>, {
    code?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    token?: string | undefined;
}, {
    code?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    token?: string | undefined;
}>;
export type VerifyInput = z.infer<typeof VerifySchema>;
export declare const ForgotPasswordSchema: z.ZodEffects<z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>, {
    email?: string | undefined;
    phone?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
}>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export declare const ResetPasswordSchema: z.ZodObject<{
    token: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    token: string;
    newPassword: string;
}, {
    token: string;
    newPassword: string;
}>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export declare const ChangePasswordSchema: z.ZodEffects<z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
    confirmPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    currentPassword: string;
    confirmPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
    confirmPassword: string;
}>, {
    newPassword: string;
    currentPassword: string;
    confirmPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
    confirmPassword: string;
}>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export declare const SetPasswordSchema: z.ZodObject<{
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    password: string;
}, {
    password: string;
}>;
export type SetPasswordInput = z.infer<typeof SetPasswordSchema>;
//# sourceMappingURL=auth.d.ts.map