import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { checkoutService } from "./checkout.service";

function uid(req: Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}

export const checkoutController = {
  catalog(_req: Request, res: Response) {
    res.json({ data: checkoutService.listCatalog() });
  },

  async createSession(req: Request, res: Response) {
    const { cart, shippingAddress } = req.body;
    const { sessionUrl } = await checkoutService.createSession(uid(req), cart, shippingAddress);
    res.json({ data: { sessionUrl } });
  },

  async getSessionStatus(req: Request, res: Response) {
    const result = await checkoutService.getSessionStatus(req.params.id, uid(req));
    res.json({ data: result });
  },

  async webhook(req: Request, res: Response) {
    const sig = req.headers["stripe-signature"] as string;
    await checkoutService.handleWebhook(req.body as Buffer, sig);
    res.json({ received: true });
  },
};
