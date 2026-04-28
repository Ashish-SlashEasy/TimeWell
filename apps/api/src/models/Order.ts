import { Schema, model, Document, Types } from "mongoose";

export interface ShippingAddressEmbedded {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AdminNote {
  adminId: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ActivityLogEntry {
  actorId: Types.ObjectId;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  timestamp: Date;
  reason?: string | null;
}

export interface OrderDoc extends Document {
  _id: Types.ObjectId;
  cardId: Types.ObjectId;
  ownerId: Types.ObjectId;
  status: "new" | "in_production" | "shipped" | "delivered" | "cancelled";
  printFileKey?: string | null;
  qrPngKey?: string | null;
  shippingAddress: ShippingAddressEmbedded;
  trackingNumber?: string | null;
  carrier?: "usps" | "ups" | "fedex" | "dhl" | "other" | null;
  adminNotes: AdminNote[];
  activityLog: ActivityLogEntry[];
  submittedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingAddressSchema = new Schema<ShippingAddressEmbedded>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, default: null, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 120 },
    state: { type: String, required: true, trim: true, maxlength: 120 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, minlength: 2, maxlength: 2 },
  },
  { _id: false },
);

const AdminNoteSchema = new Schema<AdminNote>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const ActivityLogSchema = new Schema<ActivityLogEntry>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
    reason: { type: String, default: null, maxlength: 1000 },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDoc>(
  {
    cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true, index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["new", "in_production", "shipped", "delivered", "cancelled"],
      default: "new",
      index: true,
    },
    printFileKey: { type: String, default: null },
    qrPngKey: { type: String, default: null },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    trackingNumber: { type: String, default: null },
    carrier: {
      type: String,
      enum: ["usps", "ups", "fedex", "dhl", "other"],
      default: null,
    },
    adminNotes: { type: [AdminNoteSchema], default: [] },
    activityLog: { type: [ActivityLogSchema], default: [] },
    submittedAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Order = model<OrderDoc>("Order", OrderSchema);
