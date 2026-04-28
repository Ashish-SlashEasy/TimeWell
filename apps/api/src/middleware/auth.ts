import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id: string;
      role: "user" | "admin";
    };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return next(AppError.unauthorized());
  }
  const token = header.slice(7).trim();
  if (!token) return next(AppError.unauthorized());
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(role: "user" | "admin") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(AppError.unauthorized());
    if (req.user.role !== role) return next(AppError.forbidden());
    next();
  };
}
