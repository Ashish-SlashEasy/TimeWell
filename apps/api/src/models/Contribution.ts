import { Schema, model, Document, Types } from "mongoose";

export interface ContributionDoc extends Document {
  _id: Types.ObjectId;
  cardId: Types.ObjectId;
  mediaType: "photo" | "video" | "audio";
  mediaKey: string;
  durationSec?: number | null;
  senderName: string;
  senderMessage?: string | null;
  status: "pending_scan" | "public" | "rejected" | "removed";
  createdAt: Date;
  updatedAt: Date;
}

const ContributionSchema = new Schema<ContributionDoc>(
  {
    cardId: { type: Schema.Types.ObjectId, ref: "Card", required: true, index: true },
    mediaType: { type: String, enum: ["photo", "video", "audio"], required: true },
    mediaKey: { type: String, required: true },
    durationSec: { type: Number, default: null, min: 0 },
    senderName: { type: String, required: true, trim: true, maxlength: 60 },
    senderMessage: { type: String, default: null, trim: true, maxlength: 280 },
    status: {
      type: String,
      enum: ["pending_scan", "public", "rejected", "removed"],
      default: "pending_scan",
      index: true,
    },
  },
  { timestamps: true },
);

export const Contribution = model<ContributionDoc>("Contribution", ContributionSchema);
