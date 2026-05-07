"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContributionCreateSchema = exports.CardPasswordVerifySchema = exports.UpdateCardSchema = exports.CreateCardSchema = exports.CardSettingsSchema = exports.ContributionStatus = exports.ContributionMediaType = exports.CardOrientation = exports.CardStatus = void 0;
const zod_1 = require("zod");
exports.CardStatus = zod_1.z.enum(["draft", "in_progress", "ordered", "archived", "deleted"]);
exports.CardOrientation = zod_1.z.enum(["landscape", "portrait"]);
exports.ContributionMediaType = zod_1.z.enum(["photo", "video", "audio"]);
exports.ContributionStatus = zod_1.z.enum(["pending_scan", "public", "rejected", "removed"]);
exports.CardSettingsSchema = zod_1.z.object({
    passwordProtected: zod_1.z.boolean(),
    allowContributions: zod_1.z.boolean(),
});
exports.CreateCardSchema = zod_1.z.object({
    title: zod_1.z.string().trim().max(40).optional(),
    message: zod_1.z.string().trim().max(80).optional(),
    orientation: exports.CardOrientation.optional().default("landscape"),
});
exports.UpdateCardSchema = zod_1.z.object({
    title: zod_1.z.string().max(40).optional(),
    message: zod_1.z.string().max(80).optional(),
    orientation: exports.CardOrientation.optional(),
    settings: zod_1.z
        .object({
        passwordProtected: zod_1.z.boolean().optional(),
        allowContributions: zod_1.z.boolean().optional(),
        password: zod_1.z.string().min(4).max(128).optional(),
    })
        .optional(),
});
exports.CardPasswordVerifySchema = zod_1.z.object({
    password: zod_1.z.string().min(1),
});
exports.ContributionCreateSchema = zod_1.z.object({
    mediaKey: zod_1.z.string().min(1),
    mediaType: exports.ContributionMediaType,
    durationSec: zod_1.z.number().int().nonnegative().optional(),
    senderName: zod_1.z.string().trim().min(1).max(60),
    senderMessage: zod_1.z.string().trim().max(280).optional(),
});
//# sourceMappingURL=card.js.map