import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { imageUpload, mediaUpload } from "../../utils/upload";
import { contributionsController } from "./contributions.controller";

export const contributionsRouter: Router = Router({ mergeParams: true });

const ModerateSchema = z.object({
  action: z.enum(["approve", "reject", "remove"]),
});

const UploadBodySchema = z.object({
  senderName: z.string().trim().min(1).max(60),
  senderMessage: z.string().trim().max(280).optional(),
});

// List — owner only
contributionsRouter.get("/", requireAuth, asyncHandler(contributionsController.list));

// Upload — public (any contributor)
contributionsRouter.post(
  "/",
  imageUpload.single("photo"),
  validate(UploadBodySchema),
  asyncHandler(contributionsController.upload),
);

// Moderate — owner only
contributionsRouter.patch(
  "/:contributionId/moderate",
  requireAuth,
  validate(ModerateSchema),
  asyncHandler(contributionsController.moderate),
);
