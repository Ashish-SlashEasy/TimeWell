import { createApp } from "./app";
import { connectDb, disconnectDb } from "./config/db";
import { env } from "./config/env";
import { logger } from "./config/logger";

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", { message: err.message, stack: err.stack });
  // Crash so PM2 / orchestrator restarts cleanly
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info("api:listening", { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("api:shutdown", { signal });
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("api:bootstrap-failed", { message: err.message, stack: err.stack });
  process.exit(1);
});
