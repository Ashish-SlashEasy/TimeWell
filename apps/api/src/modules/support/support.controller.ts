import { Request, Response } from "express";
import { sendContactEmail } from "./support.service";

export const supportController = {
  async contact(req: Request, res: Response) {
    const { subject, message, senderName, senderEmail } = req.body as {
      subject?: string;
      message?: string;
      senderName?: string;
      senderEmail?: string;
    };

    if (!subject?.trim() || !message?.trim()) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Subject and message are required." },
      });
      return;
    }

    await sendContactEmail({
      subject: subject.trim(),
      message: message.trim(),
      senderName: senderName?.trim() || undefined,
      senderEmail: senderEmail?.trim() || undefined,
    });

    res.status(201).json({ data: { ok: true } });
  },
};
