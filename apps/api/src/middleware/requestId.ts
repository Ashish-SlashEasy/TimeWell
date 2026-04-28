import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

declare module "express-serve-static-core" {
  interface Request {
    requestId: string;
  }
}

const HEADER = "x-request-id";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(HEADER);
  const id = typeof incoming === "string" && incoming.length > 0 && incoming.length <= 200
    ? incoming
    : uuidv4();
  req.requestId = id;
  res.setHeader(HEADER, id);
  next();
}
