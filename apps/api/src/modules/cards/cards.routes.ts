import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { imageUpload } from "../../utils/upload";
import { CreateCardSchema, UpdateCardSchema } from "@timewell/shared";
import { cardsController } from "./cards.controller";

export const cardsRouter: Router = Router();

cardsRouter.post("/", requireAuth, validate(CreateCardSchema), asyncHandler(cardsController.create));
cardsRouter.get("/", requireAuth, asyncHandler(cardsController.list));
cardsRouter.get("/:id", requireAuth, asyncHandler(cardsController.getOne));
cardsRouter.patch("/:id", requireAuth, validate(UpdateCardSchema), asyncHandler(cardsController.update));
cardsRouter.delete("/:id", requireAuth, asyncHandler(cardsController.remove));
cardsRouter.post(
  "/:id/cover",
  requireAuth,
  imageUpload.single("cover"),
  asyncHandler(cardsController.uploadCover),
);
