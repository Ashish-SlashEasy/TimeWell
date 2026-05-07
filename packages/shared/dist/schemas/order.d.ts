import { z } from "zod";
export declare const OrderStatus: z.ZodEnum<["new", "in_production", "shipped", "delivered", "cancelled"]>;
export type OrderStatus = z.infer<typeof OrderStatus>;
export declare const Carrier: z.ZodEnum<["usps", "ups", "fedex", "dhl", "other"]>;
export type Carrier = z.infer<typeof Carrier>;
export declare const PurchaseStatus: z.ZodEnum<["pending", "paid", "failed", "refunded"]>;
export type PurchaseStatus = z.infer<typeof PurchaseStatus>;
export declare const ShippingAddressSchema: z.ZodObject<{
    fullName: z.ZodString;
    line1: z.ZodString;
    line2: z.ZodOptional<z.ZodString>;
    city: z.ZodString;
    state: z.ZodString;
    postalCode: z.ZodString;
    country: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
}, {
    fullName: string;
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    line2?: string | undefined;
}>;
export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;
//# sourceMappingURL=order.d.ts.map