import { env } from "../config/env";
import { logger } from "../config/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Phase-1 email transport: log + capture in-memory for tests.
 * Phase-2 will swap to a SendGrid client behind this interface.
 */
const captured: EmailMessage[] = [];

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.isTest) {
    captured.push(msg);
    return;
  }
  logger.info("email:send", {
    to: msg.to,
    subject: msg.subject,
    from: `${env.SENDGRID_FROM_NAME} <${env.SENDGRID_FROM_EMAIL}>`,
  });
}

export function getCapturedEmails(): EmailMessage[] {
  return [...captured];
}

export function clearCapturedEmails(): void {
  captured.length = 0;
}

export function buildMagicLinkEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Your Timewell sign-in link",
    text: `Click the link below to sign in to Timewell. This link expires in 15 minutes.\n\n${link}\n\nIf you didn't request this, you can safely ignore this message.`,
    html: `<p>Click the link below to sign in to Timewell. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, you can safely ignore this message.</p>`,
  };
}

export function buildResetPasswordEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Reset your Timewell password",
    text: `Click the link below to reset your password. This link expires in 15 minutes.\n\n${link}`,
    html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p>`,
  };
}

export function buildEmailChangeVerifyEmail(to: string, link: string): EmailMessage {
  return {
    to,
    subject: "Confirm your new Timewell email",
    text: `Click the link below to confirm this email address. This link expires in 15 minutes.\n\n${link}`,
    html: `<p>Click the link below to confirm this email address. This link expires in 15 minutes.</p><p><a href="${link}">${link}</a></p>`,
  };
}
