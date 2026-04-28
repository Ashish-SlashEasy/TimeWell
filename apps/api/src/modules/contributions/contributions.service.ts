import sharp from "sharp";
import { Types } from "mongoose";
import { Card, Contribution, ContributionDoc } from "../../models";
import { AppError } from "../../utils/AppError";
import { uploadBuffer } from "../../utils/storage";

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

    const base = `cards/${cardId}/contributions/${Date.now()}`;
    const meta = await sharp(file.buffer).metadata();

    const [webBuf, thumbBuf] = await Promise.all([
      sharp(file.buffer).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer(),
      sharp(file.buffer).resize({ width: 400, height: 400, fit: "cover" }).jpeg({ quality: 75 }).toBuffer(),
    ]);

    const [webUrl, thumbUrl] = await Promise.all([
      uploadBuffer(`${base}/web.jpg`, webBuf, "image/jpeg"),
      uploadBuffer(`${base}/thumb.jpg`, thumbBuf, "image/jpeg"),
    ]);

    const mediaKey = webUrl;
    return Contribution.create({
      cardId: new Types.ObjectId(cardId),
      mediaType: "photo",
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

    const card = await Card.findOne({
      _id: contribution.cardId,
      ownerId: new Types.ObjectId(ownerId),
    });
    if (!card) throw new AppError({ code: "FORBIDDEN", statusCode: 403 });

    contribution.status =
      action === "approve" ? "public" : action === "reject" ? "rejected" : "removed";
    await contribution.save();
    return contribution;
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
