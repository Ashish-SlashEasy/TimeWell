import twilio from "twilio";
import { env } from "../config/env";
import { logger } from "../config/logger";

export interface SmsMessage {
  to: string;
  body: string;
}

const captured: SmsMessage[] = [];

function isRealTwilioCredentials(): boolean {
  return (
    env.TWILIO_ACCOUNT_SID.startsWith("AC") &&
    env.TWILIO_ACCOUNT_SID !== "ACplaceholder" &&
    env.TWILIO_AUTH_TOKEN !== "placeholder"
  );
}

export async function sendSms(msg: SmsMessage): Promise<void> {
  if (env.isTest) {
    captured.push(msg);
    return;
  }

  if (!isRealTwilioCredentials()) {
    logger.info(`DEV SMS → ${msg.to}`);
    logger.info(msg.body);
    return;
  }

  try {
    const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      to: msg.to,
      from: env.TWILIO_FROM_NUMBER,
      body: msg.body,
    });
    logger.info("sms:sent", { to: msg.to });
  } catch (err: unknown) {
    const e = err as { message?: string; code?: number; status?: number };
    console.error("\n[sms:send-failed]", { to: msg.to, message: e.message, code: e.code, status: e.status });
    throw err;
  }
}

export function getCapturedSms(): SmsMessage[] {
  return [...captured];
}

export function clearCapturedSms(): void {
  captured.length = 0;
}

export function buildOtpSms(to: string, code: string): SmsMessage {
  return {
    to,
    body: `Your Timewell verification code is ${code}. It expires in 15 minutes.`,
  };
}
