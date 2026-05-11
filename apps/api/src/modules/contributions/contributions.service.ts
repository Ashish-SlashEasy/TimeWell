import sharp from "sharp";
import { Types } from "mongoose";
import { Card, Contribution, ContributionDoc } from "../../models";
import { AppError } from "../../utils/AppError";
import { uploadBuffer, deleteFile } from "../../utils/storage";

type MediaType = "photo" | "video" | "audio";

function detectMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "photo";
}

export class ContributionsService {
  async list(cardId: string, ownerId: string): Promise<ContributionDoc[]> {
    const card = await Card.findOne({
      _id: new Types.ObjectId(cardId),
      ownerId: new Types.ObjectId(ownerId),
    });
    if (!card) throw AppError.notFound();
    return Contribution.find({ cardId: new Types.ObjectId(cardId) }).sort({ createdAt: -1 });
  }

  async upload(
    cardId: string,
    file: Express.Multer.File,
    body: { senderName: string; senderMessage?: string },
  ): Promise<ContributionDoc> {
    const card = await Card.findById(cardId);
    if (!card || card.status === "deleted") throw AppError.notFound();
    if (!card.settings.allowContributions) {
      throw new AppError({ code: "CONTRIBUTIONS_DISABLED", statusCode: 422 });
    }
    return this._storeFile(card._id.toString(), file, body);
  }

  async uploadByShareToken(
    shareToken: string,
    file: Express.Multer.File,
    body: { senderName: string; senderMessage?: string },
  ): Promise<ContributionDoc> {
    const card = await Card.findOne({ shareToken, status: { $nin: ["deleted", "archived"] } });
    if (!card) throw AppError.notFound();
    if (!card.settings.allowContributions) {
      throw new AppError({ code: "CONTRIBUTIONS_DISABLED", statusCode: 422, message: "Contributions are disabled for this card." });
    }
    return this._storeFile(card._id.toString(), file, body);
  }

  private async _storeFile(
    cardId: string,
    file: Express.Multer.File,
    body: { senderName: string; senderMessage?: string },
  ): Promise<ContributionDoc> {
    const mediaType = detectMediaType(file.mimetype);
    const base = `cards/${cardId}/contributions/${Date.now()}`;
    let mediaKey: string;

    if (mediaType === "photo") {
      const [webBuf] = await Promise.all([
        sharp(file.buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
      ]);
      mediaKey = await uploadBuffer(`${base}/web.jpg`, webBuf, "image/jpeg");
    } else {
      // Video or audio — upload original directly to Cloudinary
      const ext = file.originalname.split(".").pop() ?? "bin";
      mediaKey = await uploadBuffer(`${base}/original.${ext}`, file.buffer, file.mimetype);
    }

    return Contribution.create({
      cardId: new Types.ObjectId(cardId),
      mediaType,
      mediaKey,
      senderName: body.senderName,
      senderMessage: body.senderMessage ?? null,
      status: "public",
    });
  }

  async moderate(
    contributionId: string,
    ownerId: string,
    action: "approve" | "reject" | "remove",
  ): Promise<ContributionDoc> {
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) throw AppError.notFound();
    const card = await Card.findOne({ _id: contribution.cardId, ownerId: new Types.ObjectId(ownerId) });
    if (!card) throw new AppError({ code: "FORBIDDEN", statusCode: 403 });
    contribution.status = action === "approve" ? "public" : action === "reject" ? "rejected" : "removed";
    await contribution.save();
    return contribution;
  }

  async delete(contributionId: string, ownerId: string): Promise<void> {
    const contribution = await Contribution.findById(contributionId);
    if (!contribution) throw AppError.notFound();
    const card = await Card.findOne({ _id: contribution.cardId, ownerId: new Types.ObjectId(ownerId) });
    if (!card) throw new AppError({ code: "FORBIDDEN", statusCode: 403 });
    await deleteFile(contribution.mediaKey);
    await contribution.deleteOne();
  }

  toPublic(c: ContributionDoc) {
    return {
      id: c.id,
      cardId: c.cardId.toString(),
      mediaType: c.mediaType,
      mediaKey: c.mediaKey,
      senderName: c.senderName,
      senderMessage: c.senderMessage ?? null,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
    };
  }
}

export const contributionsService = new ContributionsService();
