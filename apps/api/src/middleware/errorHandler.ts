import { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { ErrorMessages } from "@timewell/shared";
import { AppError } from "../utils/AppError";
import { logger } from "../config/logger";

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction): void => {
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "Route not found.",
      requestId: req.requestId,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = (req as Request).requestId;

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("request:error", {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        stack: err.stack,
      });
    } else {
      logger.warn("request:operational-error", {
        requestId,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
      });
    }
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields,
        requestId,
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum allowed size is 200 MB for video/audio and 15 MB for images."
        : "File upload error.";
    res.status(413).json({ error: { code: "FILE_TOO_LARGE", message, requestId } });
    return;
  }

  if (err instanceof ZodError) {
    const flat = err.flatten();
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: ErrorMessages.VALIDATION_ERROR,
        fields: flat.fieldErrors,
        requestId,
      },
    });
    return;
  }

  // Programmer error — also write to stderr so it survives Winston's silent mode
  // (e.g. during tests) and is never swallowed.
  // eslint-disable-next-line no-console
  console.error("[programmer-error]", {
    requestId,
    name: err instanceof Error ? err.name : undefined,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  logger.error("request:unhandled", {
    requestId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: ErrorMessages.INTERNAL_ERROR,
      requestId,
    },
  });
};
