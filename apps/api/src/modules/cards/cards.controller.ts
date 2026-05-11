import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { cardsService } from "./cards.service";
import { generateQrWithLogo } from "../../utils/qr";
import { env } from "../../config/env";

function uid(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}

export const cardsController = {
  async create(req: Request, res: Response) {
    const card = await cardsService.create(uid(req), req.body);
    res.status(201).json({ data: cardsService.toPublic(card) });
  },

  async list(req: Request, res: Response) {
    const filter = req.query.filter === "archived" ? "archived" : "active";
    const cards = await cardsService.list(uid(req), filter);
    res.json({ data: cards.map(cardsService.toPublic.bind(cardsService)) });
  },

  async getOne(req: Request, res: Response) {
    const raw = await cardsService.getById(req.params.id, uid(req));
    const card = await cardsService.ensurePrintBundle(raw);
    res.json({ data: cardsService.toPublic(card) });
  },

  async update(req: Request, res: Response) {
    const card = await cardsService.update(req.params.id, uid(req), req.body);
    res.json({ data: cardsService.toPublic(card) });
  },

  async remove(req: Request, res: Response) {
    await cardsService.remove(req.params.id, uid(req));
    res.status(204).send();
  },

  async archive(req: Request, res: Response) {
    const card = await cardsService.archive(req.params.id, uid(req));
    res.json({ data: cardsService.toPublic(card) });
  },

  async restore(req: Request, res: Response) {
    const card = await cardsService.restore(req.params.id, uid(req));
    res.json({ data: cardsService.toPublic(card) });
  },

  async downloadQr(req: Request, res: Response) {
    const card = await cardsService.getById(req.params.id, uid(req));
    const url = `${env.WEB_APP_URL}/message/${card.shareToken}`;
    const png = await generateQrWithLogo(url);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="qr-${card.shareToken}.png"`);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.end(png);
  },

  async publicQr(req: Request, res: Response) {
    const card = await cardsService.getByShareToken(req.params.token);
    const url = `${env.WEB_APP_URL}/message/${card.shareToken}`;
    const png = await generateQrWithLogo(url);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.end(png);
  },

  async getShare(req: Request, res: Response) {
    const card = await cardsService.getByShareToken(req.params.token);
    if (card.settings.passwordProtected) {
      res.json({ data: { passwordProtected: true } });
    } else {
      res.json({ data: { passwordProtected: false, card: cardsService.toPublic(card) } });
    }
  },

  async verifyShare(req: Request, res: Response) {
    const { card, viewerToken } = await cardsService.verifySharePassword(req.params.token, req.body.password ?? "");
    res.cookie("viewer_token", viewerToken, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 30 * 60 * 1000,
    });
    res.json({ data: { viewerToken, card: cardsService.toPublic(card) } });
  },

  async getPublicCard(req: Request, res: Response) {
    const viewerToken =
      (req.cookies?.viewer_token as string | undefined) ??
      (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined);
    const result = await cardsService.getPublicCard(req.params.token, viewerToken);
    res.json({ data: result });
  },

  async submitOrder(req: Request, res: Response) {
    const card = await cardsService.submitOrder(req.params.id, uid(req), req.body);
    res.status(201).json({ data: cardsService.toPublic(card) });
  },

  async uploadCover(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file provided." } });
      return;
    }
    const card = await cardsService.uploadCover(
      req.params.id,
      uid(req),
      req.file.buffer,
      req.file.mimetype,
    );
    res.json({ data: cardsService.toPublic(card) });
  },

  async uploadCoverFromUrl(req: Request, res: Response) {
    const { url } = req.body as { url?: string };
    if (!url?.trim()) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "url is required." } });
      return;
    }
    const card = await cardsService.uploadCoverFromUrl(req.params.id, uid(req), url.trim());
    res.json({ data: cardsService.toPublic(card) });
  },
};
