import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";
import { cardsRouter } from "../modules/cards/cards.routes";
import { contributionsRouter } from "../modules/contributions/contributions.routes";
import { checkoutRouter } from "../modules/checkout/checkout.routes";
import { adminRouter } from "../modules/admin/admin.routes";
import { supportRouter } from "../modules/support/support.routes";

export const apiRouter: Router = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok", time: new Date().toISOString() } });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
apiRouter.use("/cards", cardsRouter);
apiRouter.use("/cards/:cardId/contributions", contributionsRouter);
apiRouter.use("/checkout", checkoutRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/support", supportRouter);
