import type { Request, Response } from "express";
import { adminService, addSseClient, removeSseClient } from "./admin.service";
import { verifyAccessToken } from "../../utils/jwt";

function adminId(req: Request): string {
  if (!req.user) throw new Error("Not authenticated");
  return req.user.id;
}

export const adminController = {
  async listOrders(req: Request, res: Response) {
    const result = await adminService.listOrders({
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json({ data: result });
  },

  async getOrder(req: Request, res: Response) {
    const order = await adminService.getOrder(req.params.id);
    res.json({ data: order });
  },

  async updateStatus(req: Request, res: Response) {
    const order = await adminService.updateStatus(req.params.id, adminId(req), req.body);
    res.json({ data: { id: order.id, status: order.status } });
  },

  async addNote(req: Request, res: Response) {
    const order = await adminService.addNote(req.params.id, adminId(req), req.body.text ?? "");
    res.json({ data: { id: order.id, noteCount: order.adminNotes.length } });
  },

  async getDownloadUrl(req: Request, res: Response) {
    const fileType = req.params.fileType as string;
    if (fileType !== "print" && fileType !== "qr") {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "fileType must be print or qr" } });
      return;
    }
    const result = await adminService.getDownloadUrl(req.params.id, fileType);
    res.json({ data: result });
  },

  // SSE uses query-param auth because EventSource cannot send Authorization headers
  stream(req: Request, res: Response) {
    const token = req.query.token as string | undefined;
    if (!token) { res.status(401).end(); return; }

    try {
      const payload = verifyAccessToken(token);
      if (payload.role !== "admin") { res.status(403).end(); return; }
    } catch {
      res.status(401).end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientId = addSseClient(res);
    res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

    const heartbeat = setInterval(() => {
      try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
    }, 15_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      removeSseClient(clientId);
    });
  },
};
