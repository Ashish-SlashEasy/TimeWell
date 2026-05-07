"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicUserSchema = exports.UpdateProfileSchema = exports.UserRole = void 0;
const zod_1 = require("zod");
exports.UserRole = zod_1.z.enum(["user", "admin"]);
exports.UpdateProfileSchema = zod_1.z.object({
    firstName: zod_1.z.string().trim().min(1).max(60).optional(),
    lastName: zod_1.z.string().trim().min(1).max(60).optional(),
    email: zod_1.z.string().trim().toLowerCase().email().optional(),
    phone: zod_1.z
        .string()
        .trim()
        .regex(/^\+[1-9]\d{6,14}$/, "Enter a valid phone number in E.164 format.")
        .optional(),
});
exports.PublicUserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    firstName: zod_1.z.string().nullable(),
    lastName: zod_1.z.string().nullable(),
    email: zod_1.z.string().nullable(),
    phone: zod_1.z.string().nullable(),
    emailVerified: zod_1.z.boolean(),
    phoneVerified: zod_1.z.boolean(),
    role: exports.UserRole,
    purchasedCards: zod_1.z.number().int().nonnegative(),
    usedCards: zod_1.z.number().int().nonnegative(),
    createdAt: zod_1.z.string(),
});
//# sourceMappingURL=user.js.map