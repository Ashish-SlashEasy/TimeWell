import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestIdMiddleware } from "./middleware/requestId";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(
      morgan(":method :url :status :res[content-length] - :response-time ms reqId=:req[x-request-id]", {
        stream: { write: (msg) => logger.http(msg.trim()) },
      }),
    );
  }

  // Serve locally-stored uploads in dev (replaced by S3 in prod)
  if (!env.isProd) {
    app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
  }

  app.use("/api", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
