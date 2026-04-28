import sharp from "sharp";
import { Types } from "mongoose";
import { CreateCardInput, UpdateCardInput } from "@timewell/shared";
import { Card, CardDoc } from "../../models";
import { AppError } from "../../utils/AppError";
import { generateShareToken } from "../../utils/tokens";
import { hashPassword, comparePassword } from "../../utils/password";
import { uploadBuffer, deleteFile } from "../../utils/storage";
import { env } from "../../config/env";

const EDITABLE_STATUSES: CardDoc["status"][] = ["draft", "in_progress"];

export class CardsService {
  async create(ownerId: string, input: CreateCardInput): Promise<CardDoc> {
    const shareToken = generateShareToken(12);
    return Card.create({
      ownerId: new Types.ObjectId(ownerId),
      shareToken,
      title: input.title ?? null,
      message: input.message ?? null,
      orientation: input.orientation ?? "landscape",
    });
  }

  async list(ownerId: string): Promise<CardDoc[]> {
    return Card.find({ ownerId: new Types.ObjectId(ownerId), status: { $ne: "deleted" } }).sort({
      createdAt: -1,
    });
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

    if (input.title !== undefined) card.title = input.title;
    if (input.message !== undefined) card.message = input.message;
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
    card.status = "deleted";
    await card.save();
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

    const [originalBuf, webBuf, thumbBuf] = await Promise.all([
      sharp(fileBuffer).resize({ width: 2000, withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer(),
      sharp(fileBuffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
      sharp(fileBuffer).resize({ width: 400, height: 400, fit: "cover" }).jpeg({ quality: 75 }).toBuffer(),
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

  async verifyPassword(cardId: string, password: string): Promise<boolean> {
    const card = await Card.findById(cardId).select("+settings.passwordHash");
    if (!card) throw AppError.notFound();
    if (!card.settings.passwordProtected || !card.settings.passwordHash) return true;
    return comparePassword(password, card.settings.passwordHash);
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
      createdAt: card.createdAt.toISOString(),
      updatedAt: card.updatedAt.toISOString(),
    };
  }
}

export const cardsService = new CardsService();
