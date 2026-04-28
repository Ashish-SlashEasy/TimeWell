import { Schema, model, Document, Types } from "mongoose";

export interface PurchaseItem {
  skuId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface PurchaseDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
  items: PurchaseItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  quantityGranted: number;
  shippingAddressSnapshot?: unknown;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseItemSchema = new Schema<PurchaseItem>(
  {
    skuId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPriceCents: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PurchaseSchema = new Schema<PurchaseDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stripeSessionId: { type: String, required: true, unique: true, index: true },
    stripePaymentIntentId: { type: String, default: null },
    items: { type: [PurchaseItemSchema], default: [] },
    subtotalCents: { type: Number, required: true, min: 0 },
    taxCents: { type: Number, default: 0, min: 0 },
    totalCents: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, minlength: 3, maxlength: 3, uppercase: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true,
    },
    quantityGranted: { type: Number, default: 0, min: 0 },
    shippingAddressSnapshot: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const Purchase = model<PurchaseDoc>("Purchase", PurchaseSchema);
