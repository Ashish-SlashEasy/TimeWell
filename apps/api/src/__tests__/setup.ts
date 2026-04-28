// Imported at the top of each test file to register lifecycle hooks.
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../config/db";
import { clearCapturedEmails } from "../utils/email";
import { clearCapturedSms } from "../utils/sms";

beforeAll(async () => {
  await connectDb(process.env.MONGODB_URI as string);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
  clearCapturedEmails();
  clearCapturedSms();
});

afterAll(async () => {
  await disconnectDb();
});
