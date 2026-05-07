import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApp } from "../src/app";
import { connectDb } from "../src/config/db";

const app = createApp();

// Module-level flag — reused across warm Vercel invocations
let dbReady = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!dbReady) {
    await connectDb();
    dbReady = true;
  }
  // Hand off to Express
  return new Promise<void>((resolve, reject) => {
    app(req as any, res as any, (err: unknown) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
