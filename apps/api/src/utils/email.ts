import { env } from "../config/env";
import { logger } from "../config/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const captured: EmailMessage[] = [];

function isRealSendGridKey(): boolean {
  return env.SENDGRID_API_KEY.startsWith("SG.") && env.SENDGRID_API_KEY !== "SG.placeholder";
}

export async function sendEmail(msg: EmailMessage): Promise<void> {
  if (env.isTest) {
    captured.push(msg);
    return;
  }

  if (!isRealSendGridKey()) {
    // Dev fallback: print full email body to terminal so magic links are usable without real credentials
    logger.info("────────────────────────────────────────");
    logger.info(`DEV EMAIL → ${msg.to} | ${msg.subject}`);
    logger.info(msg.text);
    logger.info("────────────────────────────────────────");
    return;
  }

  try {
    const mod = await import("@sendgrid/mail");
    // Handle both CJS (mod) and ESM (mod.default) interop
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sgMail: any = (mod as any).default ?? mod;
    sgMail.setApiKey(env.SENDGRID_API_KEY);
    await sgMail.send({
      to: msg.to,
      from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
    });
    logger.info("email:sent", { to: msg.to, subject: msg.subject });
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { body?: unknown } };
    logger.error("email:send-failed", { to: msg.to, message: e.message, body: e.response?.body });
    throw err;
  }
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
