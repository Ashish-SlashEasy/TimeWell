import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes";
import { usersRouter } from "../modules/users/users.routes";

export const apiRouter: Router = Router();

apiRouter.get("/health", (_req, res) => {
  res.status(200).json({ data: { status: "ok", time: new Date().toISOString() } });
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", usersRouter);
