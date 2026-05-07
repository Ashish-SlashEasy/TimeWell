import { Router } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { supportController } from "./support.controller";
import { contactRateLimiter } from "../../middleware/rateLimit";

export const supportRouter = Router();

supportRouter.post("/contact", contactRateLimiter, asyncHandler(supportController.contact));
