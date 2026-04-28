import { Schema, model, Document, Types } from "mongoose";

export interface AdminAuditLogDoc extends Document {
  _id: Types.ObjectId;
  actorAdminId: Types.ObjectId;
  action: string;
  entityType: "order" | "user" | "card";
  entityId: Types.ObjectId;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const AdminAuditLogSchema = new Schema<AdminAuditLogDoc>(
  {
    actorAdminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, enum: ["order", "user", "card"], required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AdminAuditLog = model<AdminAuditLogDoc>("AdminAuditLog", AdminAuditLogSchema);
