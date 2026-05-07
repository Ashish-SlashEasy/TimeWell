import { z } from "zod";
export declare const UserRole: z.ZodEnum<["user", "admin"]>;
export type UserRole = z.infer<typeof UserRole>;
export declare const UpdateProfileSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
}, {
    email?: string | undefined;
    phone?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
}>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export declare const PublicUserSchema: z.ZodObject<{
    id: z.ZodString;
    firstName: z.ZodNullable<z.ZodString>;
    lastName: z.ZodNullable<z.ZodString>;
    email: z.ZodNullable<z.ZodString>;
    phone: z.ZodNullable<z.ZodString>;
    emailVerified: z.ZodBoolean;
    phoneVerified: z.ZodBoolean;
    role: z.ZodEnum<["user", "admin"]>;
    purchasedCards: z.ZodNumber;
    usedCards: z.ZodNumber;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    id: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    role: "user" | "admin";
    purchasedCards: number;
    usedCards: number;
    createdAt: string;
}, {
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    id: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    role: "user" | "admin";
    purchasedCards: number;
    usedCards: number;
    createdAt: string;
}>;
export type PublicUser = z.infer<typeof PublicUserSchema>;
//# sourceMappingURL=user.d.ts.map