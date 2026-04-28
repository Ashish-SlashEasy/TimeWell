import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../utils/AppError";

type Source = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      const fields: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(flat)) {
        if (Array.isArray(v) && v.length > 0) fields[k] = v;
      }
      return next(AppError.validation(fields));
    }
    // safeParse strips unknown keys when schema uses .strict() — preserve coerced values
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
