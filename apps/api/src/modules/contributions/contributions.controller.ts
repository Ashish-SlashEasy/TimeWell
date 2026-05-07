import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { contributionsService } from "./contributions.service";

function uid(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}

export const contributionsController = {
  async list(req: Request, res: Response) {
    const items = await contributionsService.list(req.params.cardId, uid(req));
    res.json({ data: items.map(contributionsService.toPublic.bind(contributionsService)) });
  },

  async upload(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file provided." } });
      return;
    }
    const contribution = await contributionsService.upload(req.params.cardId, req.file, req.body);
    res.status(201).json({ data: contributionsService.toPublic(contribution) });
  },

  async uploadPublic(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "No file provided." } });
      return;
    }
    const contribution = await contributionsService.uploadByShareToken(req.params.token, req.file, req.body);
    res.status(201).json({ data: contributionsService.toPublic(contribution) });
  },

  async moderate(req: Request, res: Response) {
    const contribution = await contributionsService.moderate(
      req.params.contributionId,
      uid(req),
      req.body.action,
    );
    res.json({ data: contributionsService.toPublic(contribution) });
  },
};
