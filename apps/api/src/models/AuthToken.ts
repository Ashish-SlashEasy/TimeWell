import { Schema, model, Document, Types } from "mongoose";

export type AuthTokenPurpose =
  | "magic_link"
  | "otp"
  | "reset"
  | "email_change"
  | "phone_change";

export interface AuthTokenDoc extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  purpose: AuthTokenPurpose;
  tokenHash: string;
  channel: "email" | "phone";
  identifier: string; // email or phone snapshot — used to bind unbound signup tokens
  meta?: Record<string, unknown>;
  expiresAt: Date;
  consumedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AuthTokenSchema = new Schema<AuthTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    purpose: {
      type: String,
      enum: ["magic_link", "otp", "reset", "email_change", "phone_change"],
      required: true,
      index: true,
    },
    tokenHash: { type: String, required: true, index: true },
    channel: { type: String, enum: ["email", "phone"], required: true },
    identifier: { type: String, required: true, index: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// TTL: Mongo automatically removes documents after expiresAt is reached.
AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AuthToken = model<AuthTokenDoc>("AuthToken", AuthTokenSchema);
