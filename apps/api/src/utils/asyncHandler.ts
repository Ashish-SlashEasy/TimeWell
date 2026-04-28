import { NextFunction, Request, Response } from "express";

type AsyncRouteHandler<Req extends Request = Request> = (
  req: Req,
  res: Response,
  next: NextFunction,
) => Promise<unknown> | unknown;

export function asyncHandler<Req extends Request = Request>(fn: AsyncRouteHandler<Req>) {
  return (req: Req, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
