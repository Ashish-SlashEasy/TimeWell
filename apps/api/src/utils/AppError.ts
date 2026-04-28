import { ErrorCode, ErrorMessages } from "@timewell/shared";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly fields?: Record<string, string[]>;
  public readonly isOperational: boolean;

  constructor(opts: {
    code: ErrorCode | string;
    statusCode: number;
    message?: string;
    fields?: Record<string, string[]>;
    cause?: unknown;
  }) {
    const fallback =
      ErrorMessages[opts.code as ErrorCode] ?? "Something went wrong. Please try again.";
    super(opts.message ?? fallback);
    this.name = "AppError";
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.fields = opts.fields;
    this.isOperational = true;
    if (opts.cause) (this as { cause?: unknown }).cause = opts.cause;
    Error.captureStackTrace?.(this, AppError);
  }

  static unauthorized(message?: string) {
    return new AppError({ code: "UNAUTHORIZED", statusCode: 401, message });
  }
  static forbidden(message?: string) {
    return new AppError({ code: "FORBIDDEN", statusCode: 403, message });
  }
  static notFound(message?: string) {
    return new AppError({ code: "NOT_FOUND", statusCode: 404, message });
  }
  static rateLimited(message?: string) {
    return new AppError({ code: "RATE_LIMITED", statusCode: 429, message });
  }
  static validation(fields: Record<string, string[]>, message?: string) {
    return new AppError({ code: "VALIDATION_ERROR", statusCode: 400, message, fields });
  }
}
