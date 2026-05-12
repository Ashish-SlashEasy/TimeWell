import { Schema, model, Document, Types } from "mongoose";

export interface CoverImage {
  original: string | null;
  web: string | null;
  thumb: string | null;
  orientation: "landscape" | "portrait";
}

export interface CardSettings {
  passwordProtected: boolean;
  passwordHash: string | null;
  allowContributions: boolean;
}

export interface PrintBundle {
  jpgKey: string | null;
  qrPngKey: string | null;
  generatedAt: Date | null;
}

export interface CardDoc extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  shareToken: string;
  status: "draft" | "in_progress" | "ordered" | "cancelled" | "archived" | "deleted";
  coverImage: CoverImage;
  orientation: "landscape" | "portrait";
  title: string | null;
  message: string | null;
  settings: CardSettings;
  printBundle: PrintBundle;
  orderedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CardSchema = new Schema<CardDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    shareToken: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["draft", "in_progress", "ordered", "cancelled", "archived", "deleted"],
      default: "draft",
      index: true,
    },
    coverImage: {
      original: { type: String, default: null },
      web: { type: String, default: null },
      thumb: { type: String, default: null },
      orientation: { type: String, enum: ["landscape", "portrait"], default: "landscape" },
    },
    orientation: { type: String, enum: ["landscape", "portrait"], default: "landscape" },
    title: { type: String, default: null, maxlength: 40 },
    message: { type: String, default: null, maxlength: 80 },
    settings: {
      passwordProtected: { type: Boolean, default: false },
      passwordHash: { type: String, default: null, select: false },
      allowContributions: { type: Boolean, default: true },
    },
    printBundle: {
      jpgKey: { type: String, default: null },
      qrPngKey: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
    orderedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Card = model<CardDoc>("Card", CardSchema);
