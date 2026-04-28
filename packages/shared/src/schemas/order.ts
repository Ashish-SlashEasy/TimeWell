import { z } from "zod";

export const OrderStatus = z.enum(["new", "in_production", "shipped", "delivered", "cancelled"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

export const Carrier = z.enum(["usps", "ups", "fedex", "dhl", "other"]);
export type Carrier = z.infer<typeof Carrier>;

export const PurchaseStatus = z.enum(["pending", "paid", "failed", "refunded"]);
export type PurchaseStatus = z.infer<typeof PurchaseStatus>;

export const ShippingAddressSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2),
});
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
