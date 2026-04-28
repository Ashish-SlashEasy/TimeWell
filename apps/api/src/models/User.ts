import { Schema, model, Document, Types } from "mongoose";

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  email?: string | null;
  phone?: string | null;
  passwordHash?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  purchasedCards: number;
  usedCards: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  role: "user" | "admin";
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true, default: null },
    passwordHash: { type: String, default: null, select: false },
    firstName: { type: String, trim: true, default: null, maxlength: 60 },
    lastName: { type: String, trim: true, default: null, maxlength: 60 },
    purchasedCards: { type: Number, default: 0, min: 0 },
    usedCards: { type: Number, default: 0, min: 0 },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },
    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockedUntil: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

// Unique sparse indexes — Section 3
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const User = model<UserDoc>("User", UserSchema);
