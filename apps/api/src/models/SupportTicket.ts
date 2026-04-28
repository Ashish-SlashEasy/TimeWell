import { Schema, model, Document, Types } from "mongoose";

export interface SupportTicketDoc extends Document {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  subject: string;
  message: string;
  status: "open" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<SupportTicketDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: { type: String, enum: ["open", "resolved"], default: "open", index: true },
  },
  { timestamps: true },
);

export const SupportTicket = model<SupportTicketDoc>("SupportTicket", SupportTicketSchema);
