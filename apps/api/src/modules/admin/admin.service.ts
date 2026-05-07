import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import sgMail from "@sendgrid/mail";
import { Types } from "mongoose";
import type { Response } from "express";
import { AdminAuditLog } from "../../models/AdminAuditLog";
import { Card } from "../../models/Card";
import { Order, type OrderDoc } from "../../models/Order";
import { User } from "../../models/User";
import { AppError } from "../../utils/AppError";
import { uploadBuffer } from "../../utils/storage";
import { env } from "../../config/env";

const STATUS_ORDER = ["new", "in_production", "shipped", "delivered"] as const;
type ProgressStatus = (typeof STATUS_ORDER)[number];

function statusIndex(s: string): number {
  return STATUS_ORDER.indexOf(s as ProgressStatus);
}

// ── SSE client management ──────────────────────────────────────────────────
type SseClient = { res: Response; id: number };
let sseClients: SseClient[] = [];
let sseNextId = 0;

export function addSseClient(res: Response): number {
  const id = ++sseNextId;
  sseClients.push({ res, id });
  return id;
}

export function removeSseClient(id: number): void {
  sseClients = sseClients.filter((c) => c.id !== id);
}

function broadcast(data: object): void {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter((client) => {
    try {
      client.res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

// ── Print file generation ──────────────────────────────────────────────────
const LOCAL_UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const localPrefix = `${env.API_PUBLIC_URL}/uploads/`;
  if (url.startsWith(localPrefix)) {
    const relPath = url.slice(localPrefix.length);
    return fs.readFile(path.join(LOCAL_UPLOADS_DIR, relPath));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generatePrintFile(order: OrderDoc): Promise<string> {
  const card = await Card.findById(order.cardId);
  if (!card?.coverImage.original) {
    throw new AppError({ code: "NOT_FOUND", statusCode: 404, message: "Card has no cover image." });
  }

  const sourceBuffer = await fetchImageBuffer(card.coverImage.original);

  // 4×6 at 300 DPI — landscape = 1800×1200, portrait = 1200×1800
  const [w, h] = card.orientation === "landscape" ? [1800, 1200] : [1200, 1800];
  const printBuffer = await sharp(sourceBuffer)
    .resize(w, h, { fit: "cover", position: "centre" })
    .jpeg({ quality: 95 })
    .toBuffer();

  const key = `orders/${order._id}/print.jpg`;
  const url = await uploadBuffer(key, printBuffer, "image/jpeg");
  order.printFileKey = url;
  await order.save();

  card.printBundle = { ...card.printBundle, jpgKey: url, generatedAt: new Date() };
  await card.save();

  return url;
}

// ── Service ────────────────────────────────────────────────────────────────
export interface ListOrdersQuery {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UpdateStatusInput {
  status: OrderDoc["status"];
  trackingNumber?: string;
  carrier?: OrderDoc["carrier"];
  reason?: string;
}

export const adminService = {
  async listOrders(query: ListOrdersQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 25));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (query.status && query.status !== "all") {
      filter.status = query.status;
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      const orConditions: object[] = [];

      if (Types.ObjectId.isValid(s)) {
        orConditions.push({ _id: new Types.ObjectId(s) });
      }

      const [matchUsers, matchCards] = await Promise.all([
        User.find({ email: { $regex: s, $options: "i" } }, { _id: 1 }).limit(50),
        Card.find({ title: { $regex: s, $options: "i" } }, { _id: 1 }).limit(50),
      ]);

      if (matchUsers.length) orConditions.push({ ownerId: { $in: matchUsers.map((u) => u._id) } });
      if (matchCards.length) orConditions.push({ cardId: { $in: matchCards.map((c) => c._id) } });

      if (!orConditions.length) return { orders: [], total: 0, page, limit, totalPages: 0 };
      filter.$or = orConditions;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("ownerId", "firstName lastName email")
        .populate("cardId", "title coverImage orientation")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter),
    ]);

    return { orders, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async getOrder(orderId: string) {
    const order = await Order.findById(orderId)
      .populate("ownerId", "firstName lastName email phone")
      .populate("cardId", "title message coverImage orientation shareToken")
      .populate({ path: "adminNotes.adminId", select: "firstName lastName" })
      .lean();
    if (!order) throw AppError.notFound();
    return order;
  },

  async updateStatus(orderId: string, adminId: string, input: UpdateStatusInput) {
    const order = await Order.findById(orderId);
    if (!order) throw AppError.notFound();

    const from = order.status;
    const to = input.status;

    if (from === to) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Order is already in that status." });
    }
    if (from === "delivered") {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Delivered orders cannot be changed." });
    }
    if (from === "cancelled" && to !== "cancelled") {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Cancelled orders cannot be changed." });
    }

    if (to !== "cancelled") {
      const fromIdx = statusIndex(from);
      const toIdx = statusIndex(to);
      if (toIdx === -1) {
        throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: `Invalid status: ${to}` });
      }
      if (toIdx > fromIdx && toIdx !== fromIdx + 1) {
        throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Cannot skip statuses." });
      }
      if (toIdx < fromIdx && !input.reason?.trim()) {
        throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "A reason is required for backwards status changes." });
      }
    }

    if (to === "shipped") {
      if (!input.trackingNumber?.trim() || !input.carrier) {
        throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Tracking number and carrier required when marking shipped." });
      }
      order.trackingNumber = input.trackingNumber.trim();
      order.carrier = input.carrier;
      order.shippedAt = new Date();
    } else if (to === "delivered") {
      order.deliveredAt = new Date();
    } else if (to === "cancelled") {
      order.cancelledAt = new Date();
    }

    order.status = to;
    order.activityLog.push({
      actorId: new Types.ObjectId(adminId),
      action: "status_changed",
      fromStatus: from,
      toStatus: to,
      timestamp: new Date(),
      reason: input.reason?.trim() ?? null,
    });

    await order.save();

    await AdminAuditLog.create({
      actorAdminId: new Types.ObjectId(adminId),
      action: "order.status_changed",
      entityType: "order",
      entityId: order._id,
      payload: { from, to, trackingNumber: input.trackingNumber, carrier: input.carrier, reason: input.reason },
    });

    if (to === "cancelled") {
      await User.findByIdAndUpdate(order.ownerId, { $inc: { usedCards: -1 } });
    }

    try {
      const user = await User.findById(order.ownerId);
      if (user?.email) {
        sgMail.setApiKey(env.SENDGRID_API_KEY);
        const trackUrls: Record<string, string> = {
          usps: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${input.trackingNumber}`,
          ups: `https://www.ups.com/track?tracknum=${input.trackingNumber}`,
          fedex: `https://www.fedex.com/fedextrack/?trknbr=${input.trackingNumber}`,
          dhl: `https://www.dhl.com/en/express/tracking.html?AWB=${input.trackingNumber}`,
        };

        if (to === "shipped" && input.trackingNumber && input.carrier) {
          const trackUrl = trackUrls[input.carrier] ?? "";
          await sgMail.send({
            to: user.email,
            from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
            subject: "Your Timewell card has shipped!",
            text: `Your Timewell card has shipped via ${input.carrier.toUpperCase()}. Tracking: ${input.trackingNumber}${trackUrl ? `. Track at: ${trackUrl}` : ""}`,
            html: `<p>Great news! Your Timewell card is on its way.</p><p><strong>Carrier:</strong> ${input.carrier.toUpperCase()}<br><strong>Tracking:</strong> ${input.trackingNumber}</p>${trackUrl ? `<p><a href="${trackUrl}">Track your package</a></p>` : ""}<p><a href="${env.WEB_APP_URL}/dashboard">View your dashboard</a></p>`,
          });
        } else if (to === "delivered") {
          await sgMail.send({
            to: user.email,
            from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
            subject: "Your Timewell card has been delivered!",
            text: "Your Timewell card has been delivered. We hope you love it!",
            html: `<p>Your Timewell card has been delivered! We hope it brings you joy.</p><p><a href="${env.WEB_APP_URL}/dashboard">View your dashboard</a></p>`,
          });
        }
      }
    } catch { /* email is non-fatal */ }

    broadcast({ type: "order_updated", orderId: order.id, status: to });
    return order;
  },

  async addNote(orderId: string, adminId: string, text: string) {
    if (!text.trim()) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Note text cannot be empty." });
    }
    const order = await Order.findById(orderId);
    if (!order) throw AppError.notFound();

    order.adminNotes.push({
      adminId: new Types.ObjectId(adminId),
      text: text.trim(),
      createdAt: new Date(),
    });
    await order.save();

    await AdminAuditLog.create({
      actorAdminId: new Types.ObjectId(adminId),
      action: "order.note_added",
      entityType: "order",
      entityId: order._id,
      payload: { noteLength: text.length },
    });

    return order;
  },

  async getDownloadUrl(orderId: string, fileType: "print" | "qr") {
    const order = await Order.findById(orderId);
    if (!order) throw AppError.notFound();

    if (fileType === "qr") {
      if (!order.qrPngKey) {
        throw new AppError({ code: "NOT_FOUND", statusCode: 404, message: "QR file not yet generated." });
      }
      return { url: order.qrPngKey };
    }

    // Generate print file on demand if missing
    const url = order.printFileKey ?? (await generatePrintFile(order));
    return { url };
  },
};
