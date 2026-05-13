import sharp from "sharp";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { CreateCardInput, UpdateCardInput } from "@timewell/shared";
import { Card, CardDoc, Contribution, Order, User } from "../../models";
import { AppError } from "../../utils/AppError";
import { generateShareToken } from "../../utils/tokens";
import { hashPassword, comparePassword } from "../../utils/password";
import { uploadBuffer, deleteFile, downloadBuffer } from "../../utils/storage";
import { generateQrWithLogo, composeCardImage } from "../../utils/qr";
import { env } from "../../config/env";
import { containsProfanity } from "../../utils/profanity";

const EDITABLE_STATUSES: CardDoc["status"][] = ["draft", "in_progress"];

export class CardsService {
  async create(ownerId: string, input: CreateCardInput): Promise<CardDoc> {
    const user = await User.findById(ownerId);
    if (!user) throw AppError.notFound();
    if (user.usedCards >= user.purchasedCards) {
      throw new AppError({ code: "QUOTA_EXHAUSTED", statusCode: 402, message: "No cards available. Buy more?" });
    }

    const shareToken = generateShareToken(12);
    const card = await Card.create({
      ownerId: new Types.ObjectId(ownerId),
      shareToken,
      title: input.title ?? null,
      message: input.message ?? null,
      orientation: input.orientation ?? "landscape",
    });

    await User.updateOne({ _id: ownerId }, { $inc: { usedCards: 1 } });
    return card;
  }

  async list(ownerId: string, filter: "active" | "archived" = "active"): Promise<CardDoc[]> {
    const statusQuery =
      filter === "archived"
        ? { status: "archived" }
        : { status: { $nin: ["deleted", "archived"] } };
    return Card.find({ ownerId: new Types.ObjectId(ownerId), ...statusQuery }).sort({ createdAt: -1 });
  }

  async getById(cardId: string, ownerId: string): Promise<CardDoc> {
    const card = await Card.findOne({
      _id: new Types.ObjectId(cardId),
      ownerId: new Types.ObjectId(ownerId),
      status: { $ne: "deleted" },
    });
    if (!card) throw AppError.notFound();
    return card;
  }

  async update(cardId: string, ownerId: string, input: UpdateCardInput): Promise<CardDoc> {
    const card = await this.getById(cardId, ownerId);
    if (!EDITABLE_STATUSES.includes(card.status)) {
      throw new AppError({ code: "CARD_NOT_EDITABLE", statusCode: 422 });
    }

    if (containsProfanity(input.title, input.message)) {
      throw new AppError({
        code: "PROFANITY_DETECTED",
        statusCode: 422,
        message: "Your title or message contains inappropriate language. Please revise and try again.",
      });
    }

    if (input.title !== undefined) card.title = input.title;
    if (input.message !== undefined) card.message = input.message;

    if (input.orientation !== undefined && input.orientation !== card.orientation && card.coverImage?.original) {
      const originalBuf = await downloadBuffer(card.coverImage.original);
      const shareUrl = `${env.WEB_APP_URL}/message/${card.shareToken}`;
      const qrBuffer = await generateQrWithLogo(shareUrl);
      const base = `cards/${card._id}/cover`;
      const [webBuf, thumbBuf] = await Promise.all([
        composeCardImage(originalBuf, input.orientation, qrBuffer, "web"),
        composeCardImage(originalBuf, input.orientation, qrBuffer, "thumb"),
      ]);
      const [webUrl, thumbUrl] = await Promise.all([
        uploadBuffer(`${base}/web.jpg`, webBuf, "image/jpeg"),
        uploadBuffer(`${base}/thumb.jpg`, thumbBuf, "image/jpeg"),
      ]);
      card.coverImage.web = webUrl;
      card.coverImage.thumb = thumbUrl;
      card.coverImage.orientation = input.orientation;
    }

    if (input.orientation !== undefined) card.orientation = input.orientation;

    if (input.settings) {
      if (input.settings.allowContributions !== undefined) {
        card.settings.allowContributions = input.settings.allowContributions;
      }
      if (input.settings.passwordProtected !== undefined) {
        card.settings.passwordProtected = input.settings.passwordProtected;
        if (!input.settings.passwordProtected) {
          card.settings.passwordHash = null;
        }
      }
      if (input.settings.password) {
        card.settings.passwordProtected = true;
        card.settings.passwordHash = await hashPassword(input.settings.password);
      }
    }

    await card.save();
    return card;
  }

  async remove(cardId: string, ownerId: string): Promise<void> {
    const card = await this.getById(cardId, ownerId);
    const quotaAlreadyRestored = card.status === "archived" || card.status === "cancelled";
    card.status = "deleted";
    await card.save();
    if (!quotaAlreadyRestored) {
      await User.updateOne({ _id: ownerId }, { $inc: { usedCards: -1 } });
    }
  }

  async archive(cardId: string, ownerId: string): Promise<CardDoc> {
    const card = await this.getById(cardId, ownerId);
    if (card.status === "archived") {
      throw new AppError({ code: "CARD_ALREADY_ARCHIVED", statusCode: 422 });
    }
    const quotaAlreadyRestored = card.status === "cancelled";
    card.status = "archived";
    await card.save();
    if (!quotaAlreadyRestored) {
      await User.updateOne({ _id: ownerId }, { $inc: { usedCards: -1 } });
    }
    return card;
  }

  async restore(cardId: string, ownerId: string): Promise<CardDoc> {
    const card = await Card.findOne({
      _id: new Types.ObjectId(cardId),
      ownerId: new Types.ObjectId(ownerId),
      status: "archived",
    });
    if (!card) throw AppError.notFound();

    const user = await User.findById(ownerId);
    if (!user) throw AppError.notFound();
    if (user.usedCards >= user.purchasedCards) {
      throw new AppError({ code: "QUOTA_EXHAUSTED", statusCode: 402, message: "No cards available. Buy more?" });
    }

    card.status = card.coverImage?.original ? "in_progress" : "draft";
    await card.save();
    await User.updateOne({ _id: ownerId }, { $inc: { usedCards: 1 } });
    return card;
  }

  async uploadCover(cardId: string, ownerId: string, fileBuffer: Buffer, mimeType: string): Promise<CardDoc> {
    const card = await this.getById(cardId, ownerId);
    if (!EDITABLE_STATUSES.includes(card.status)) {
      throw new AppError({ code: "CARD_NOT_EDITABLE", statusCode: 422 });
    }

    // Delete old cover files
    if (card.coverImage.original) await deleteFile(card.coverImage.original.replace(/^\/uploads\//, "")).catch(() => null);
    if (card.coverImage.web) await deleteFile(card.coverImage.web.replace(/^\/uploads\//, "")).catch(() => null);
    if (card.coverImage.thumb) await deleteFile(card.coverImage.thumb.replace(/^\/uploads\//, "")).catch(() => null);

    const base = `cards/${cardId}/cover`;
    const meta = await sharp(fileBuffer).metadata();
    const orientation: "landscape" | "portrait" =
      (meta.width ?? 0) >= (meta.height ?? 0) ? "landscape" : "portrait";

    const shareUrl = `${env.WEB_APP_URL}/message/${card.shareToken}`;
    const originalBuf = await sharp(fileBuffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const qrBuffer = await generateQrWithLogo(shareUrl);
    const [webBuf, thumbBuf] = await Promise.all([
      composeCardImage(fileBuffer, orientation, qrBuffer, "web"),
      composeCardImage(fileBuffer, orientation, qrBuffer, "thumb"),
    ]);

    const [originalUrl, webUrl, thumbUrl] = await Promise.all([
      uploadBuffer(`${base}/original.jpg`, originalBuf, "image/jpeg"),
      uploadBuffer(`${base}/web.jpg`, webBuf, "image/jpeg"),
      uploadBuffer(`${base}/thumb.jpg`, thumbBuf, "image/jpeg"),
    ]);

    card.coverImage = { original: originalUrl, web: webUrl, thumb: thumbUrl, orientation };
    card.orientation = orientation;
    if (card.status === "draft") card.status = "in_progress";
    await card.save();
    return card;
  }

  async uploadCoverFromUrl(cardId: string, ownerId: string, imageUrl: string): Promise<CardDoc> {
    // SSRF guard
    let parsed: URL;
    try { parsed = new URL(imageUrl); } catch {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Invalid URL." });
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "URL must use HTTP or HTTPS." });
    }
    const h = parsed.hostname.toLowerCase();
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h === "::1" || h === "0.0.0.0") {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "URL not allowed." });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(imageUrl, { signal: controller.signal });
    } catch {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Could not fetch image from URL." });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: `Remote server returned ${response.status}.` });
    }

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (!ALLOWED_TYPES.includes(contentType)) {
      throw new AppError({ code: "UNSUPPORTED_MEDIA_TYPE", statusCode: 415 });
    }

    const MAX_BYTES = 15 * 1024 * 1024;
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message: "Image exceeds 15 MB limit." });
    }

    return this.uploadCover(cardId, ownerId, Buffer.from(arrayBuffer), contentType);
  }

  async verifyPassword(cardId: string, password: string): Promise<boolean> {
    const card = await Card.findById(cardId).select("+settings.passwordHash");
    if (!card) throw AppError.notFound();
    if (!card.settings.passwordProtected || !card.settings.passwordHash) return true;
    return comparePassword(password, card.settings.passwordHash);
  }

  async getByShareToken(shareToken: string): Promise<CardDoc> {
    const card = await Card.findOne({ shareToken, status: { $nin: ["deleted", "archived"] } });
    if (!card) throw AppError.notFound();
    return card;
  }

  async verifySharePassword(shareToken: string, password: string): Promise<{ card: CardDoc; viewerToken: string }> {
    const card = await Card.findOne({ shareToken, status: { $nin: ["deleted", "archived"] } }).select("+settings.passwordHash");
    if (!card) throw AppError.notFound();
    if (card.settings.passwordProtected && card.settings.passwordHash) {
      const ok = await comparePassword(password, card.settings.passwordHash);
      if (!ok) throw new AppError({ code: "INVALID_PASSWORD", statusCode: 401, message: "Incorrect password. Please try again." });
    }
    const viewerToken = jwt.sign({ shareToken, sub: "viewer" }, env.VIEWER_JWT_SECRET, { expiresIn: "30m" });
    return { card, viewerToken };
  }

  async getPublicCard(shareToken: string, viewerToken?: string) {
    const card = await Card.findOne({ shareToken, status: { $nin: ["deleted", "archived"] } });
    if (!card) throw AppError.notFound();

    if (card.settings.passwordProtected) {
      if (!viewerToken) throw new AppError({ code: "VIEWER_AUTH_REQUIRED", statusCode: 401, message: "Password required." });
      try {
        const payload = jwt.verify(viewerToken, env.VIEWER_JWT_SECRET) as { shareToken: string };
        if (payload.shareToken !== shareToken) throw new Error("token mismatch");
      } catch {
        throw new AppError({ code: "VIEWER_AUTH_INVALID", statusCode: 401, message: "Viewer session expired. Please re-enter the password." });
      }
    }

    const contributions = await Contribution.find({
      cardId: card._id,
      status: "public",
    }).sort({ createdAt: -1 }).limit(100);

    return {
      card: this.toPublic(card),
      contributions: contributions.map((c) => ({
        id: c.id,
        mediaType: c.mediaType,
        mediaKey: c.mediaKey,
        senderName: c.senderName,
        senderMessage: c.senderMessage ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  async submitOrder(
    cardId: string,
    ownerId: string,
    shippingAddress: {
      fullName: string;
      line1: string;
      line2?: string | null;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    },
  ): Promise<CardDoc> {
    const card = await this.getById(cardId, ownerId);

    if (card.status === "ordered") {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 422, message: "This card has already been ordered." });
    }
    if (!card.coverImage?.original) {
      throw new AppError({ code: "VALIDATION_ERROR", statusCode: 422, message: "Add a cover image before submitting an order." });
    }

    const order = await Order.create({
      cardId: card._id,
      ownerId: new Types.ObjectId(ownerId),
      status: "new",
      shippingAddress,
      submittedAt: new Date(),
      printFileKey: card.coverImage.web ?? card.coverImage.original ?? null,
      qrPngKey: null,
    });

    const shareUrl = `${env.WEB_APP_URL}/message/${card.shareToken}`;
    const qrBuffer = await generateQrWithLogo(shareUrl);
    const qrUrl = await uploadBuffer(`cards/${card._id}/qr.png`, qrBuffer, "image/png");

    order.qrPngKey = qrUrl;
    await order.save();

    card.status = "ordered";
    card.orderedAt = new Date();
    card.printBundle = {
      jpgKey: card.coverImage.web ?? card.coverImage.original ?? null,
      qrPngKey: qrUrl,
      generatedAt: new Date(),
    };
    await card.save();
    return card;
  }

  async ensurePrintBundle(card: CardDoc): Promise<CardDoc> {
    if (card.status !== "ordered" || card.printBundle?.qrPngKey) return card;

    const shareUrl = `${env.WEB_APP_URL}/message/${card.shareToken}`;
    const qrBuffer = await generateQrWithLogo(shareUrl);
    const qrUrl = await uploadBuffer(`cards/${card._id}/qr.png`, qrBuffer, "image/png");

    card.printBundle = {
      jpgKey: card.coverImage.web ?? card.coverImage.original ?? null,
      qrPngKey: qrUrl,
      generatedAt: new Date(),
    };
    await card.save();
    return card;
  }

  toPublic(card: CardDoc) {
    return {
      id: card.id,
      shareToken: card.shareToken,
      status: card.status,
      title: card.title,
      message: card.message,
      orientation: card.orientation,
      coverImage: card.coverImage,
      settings: {
        passwordProtected: card.settings.passwordProtected,
        allowContributions: card.settings.allowContributions,
      },
      printBundle: {
        jpgKey: card.printBundle?.jpgKey ?? null,
        qrPngKey: card.printBundle?.qrPngKey ?? null,
        generatedAt: card.printBundle?.generatedAt?.toISOString() ?? null,
      },
      orderedAt: card.orderedAt?.toISOString() ?? null,
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}

export const cardsService = new CardsService();
