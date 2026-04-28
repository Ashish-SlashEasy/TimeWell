import { env } from "../config/env";
import { logger } from "../config/logger";

export interface SmsMessage {
  to: string;
  body: string;
}

const captured: SmsMessage[] = [];

export async function sendSms(msg: SmsMessage): Promise<void> {
  if (env.isTest) {
    captured.push(msg);
    return;
  }
  logger.info("sms:send", { to: msg.to, from: env.TWILIO_FROM_NUMBER });
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
