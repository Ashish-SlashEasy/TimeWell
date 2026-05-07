import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { imageUpload, mediaUpload } from "../../utils/upload";
import { CreateCardSchema, UpdateCardSchema } from "@timewell/shared";
import { viewerPasswordRateLimiter } from "../../middleware/rateLimit";
import { cardsController } from "./cards.controller";
import { contributionsController } from "../contributions/contributions.controller";

const ContribBodySchema = z.object({
  senderName: z.string().trim().min(1).max(60),
  senderMessage: z.string().trim().max(280).optional(),
});

export const cardsRouter: Router = Router();

// ── Public share routes (no auth) ───────────────────────────────────────────
cardsRouter.get("/share/:token/qr", asyncHandler(cardsController.publicQr));
cardsRouter.get("/share/:token", asyncHandler(cardsController.getShare));
cardsRouter.post("/share/:token/verify", viewerPasswordRateLimiter, asyncHandler(cardsController.verifyShare));
cardsRouter.get("/public/:token", asyncHandler(cardsController.getPublicCard));
cardsRouter.post("/public/:token/contributions", mediaUpload.single("media"), validate(ContribBodySchema), asyncHandler(contributionsController.uploadPublic));

cardsRouter.get("/:id/qr", requireAuth, asyncHandler(cardsController.downloadQr));
cardsRouter.post("/", requireAuth, validate(CreateCardSchema), asyncHandler(cardsController.create));
cardsRouter.get("/", requireAuth, asyncHandler(cardsController.list));
cardsRouter.get("/:id", requireAuth, asyncHandler(cardsController.getOne));
cardsRouter.patch("/:id", requireAuth, validate(UpdateCardSchema), asyncHandler(cardsController.update));
cardsRouter.delete("/:id", requireAuth, asyncHandler(cardsController.remove));
cardsRouter.post("/:id/archive", requireAuth, asyncHandler(cardsController.archive));
cardsRouter.post("/:id/restore", requireAuth, asyncHandler(cardsController.restore));
cardsRouter.post("/:id/submit-order", requireAuth, asyncHandler(cardsController.submitOrder));
cardsRouter.post(
  "/:id/cover",
  requireAuth,
  imageUpload.single("cover"),
  asyncHandler(cardsController.uploadCover),
);
cardsRouter.post("/:id/cover-from-url", requireAuth, asyncHandler(cardsController.uploadCoverFromUrl));
