import { z } from "zod";

export const CardStatus = z.enum(["draft", "in_progress", "ordered", "archived", "deleted"]);
export type CardStatus = z.infer<typeof CardStatus>;

export const CardOrientation = z.enum(["landscape", "portrait"]);
export type CardOrientation = z.infer<typeof CardOrientation>;

export const ContributionMediaType = z.enum(["photo", "video", "audio"]);
export type ContributionMediaType = z.infer<typeof ContributionMediaType>;

export const ContributionStatus = z.enum(["pending_scan", "public", "rejected", "removed"]);
export type ContributionStatus = z.infer<typeof ContributionStatus>;

export const CardSettingsSchema = z.object({
  passwordProtected: z.boolean(),
  allowContributions: z.boolean(),
});
export type CardSettings = z.infer<typeof CardSettingsSchema>;

export const CreateCardSchema = z.object({
  title: z.string().trim().max(40).optional(),
  message: z.string().trim().max(80).optional(),
  orientation: CardOrientation.optional().default("landscape"),
});
export type CreateCardInput = z.infer<typeof CreateCardSchema>;

export const UpdateCardSchema = z.object({
  title: z.string().max(40).optional(),
  message: z.string().max(80).optional(),
  orientation: CardOrientation.optional(),
  settings: z
    .object({
      passwordProtected: z.boolean().optional(),
      allowContributions: z.boolean().optional(),
      password: z.string().min(4).max(128).optional(),
    })
    .optional(),
});
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;

export const CardPasswordVerifySchema = z.object({
  password: z.string().min(1),
});
export type CardPasswordVerifyInput = z.infer<typeof CardPasswordVerifySchema>;

export const ContributionCreateSchema = z.object({
  mediaKey: z.string().min(1),
  mediaType: ContributionMediaType,
  durationSec: z.number().int().nonnegative().optional(),
  senderName: z.string().trim().min(1).max(60),
  senderMessage: z.string().trim().max(280).optional(),
});
export type ContributionCreateInput = z.infer<typeof ContributionCreateSchema>;
