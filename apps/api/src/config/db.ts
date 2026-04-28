import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

mongoose.set("strictQuery", true);

let connected = false;

export async function connectDb(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (connected) return mongoose;
  await mongoose.connect(uri, {
    autoIndex: !env.isProd,
    serverSelectionTimeoutMS: 10000,
  });
  connected = true;
  logger.info("mongo:connected", { uri: redactUri(uri) });
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}

function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
}
