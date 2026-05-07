import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { asyncHandler } from "../../utils/asyncHandler";
import { checkoutController } from "./checkout.controller";
import { ShippingAddressSchema } from "@timewell/shared";

const CartItemSchema = z.object({
  skuId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(99),
});

const CreateSessionSchema = z.object({
  cart: z.array(CartItemSchema).min(1),
  shippingAddress: ShippingAddressSchema,
});

export const checkoutRouter: Router = Router();

checkoutRouter.get("/catalog", asyncHandler(checkoutController.catalog));
checkoutRouter.post("/session", requireAuth, validate(CreateSessionSchema), asyncHandler(checkoutController.createSession));
checkoutRouter.get("/session/:id", requireAuth, asyncHandler(checkoutController.getSessionStatus));
