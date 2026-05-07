"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingAddressSchema = exports.PurchaseStatus = exports.Carrier = exports.OrderStatus = void 0;
const zod_1 = require("zod");
exports.OrderStatus = zod_1.z.enum(["new", "in_production", "shipped", "delivered", "cancelled"]);
exports.Carrier = zod_1.z.enum(["usps", "ups", "fedex", "dhl", "other"]);
exports.PurchaseStatus = zod_1.z.enum(["pending", "paid", "failed", "refunded"]);
exports.ShippingAddressSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(1).max(120),
    line1: zod_1.z.string().trim().min(1).max(200),
    line2: zod_1.z.string().trim().max(200).optional(),
    city: zod_1.z.string().trim().min(1).max(120),
    state: zod_1.z.string().trim().min(1).max(120),
    postalCode: zod_1.z.string().trim().min(1).max(20),
    country: zod_1.z.string().trim().length(2),
});
//# sourceMappingURL=order.js.map