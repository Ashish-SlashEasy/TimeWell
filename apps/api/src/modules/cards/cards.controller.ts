import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { cardsService } from "./cards.service";

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
    const cards = await cardsService.list(uid(req));
    res.json({ data: cards.map(cardsService.toPublic.bind(cardsService)) });
  },

  async getOne(req: Request, res: Response) {
    const card = await cardsService.getById(req.params.id, uid(req));
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
};
