import { z } from "zod";

export const UserRole = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRole>;

export const UpdateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number in E.164 format.")
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const PublicUserSchema = z.object({
  id: z.string(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  role: UserRole,
  purchasedCards: z.number().int().nonnegative(),
  usedCards: z.number().int().nonnegative(),
  createdAt: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;
