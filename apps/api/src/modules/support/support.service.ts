import sgMail from "@sendgrid/mail";
import { env } from "../../config/env";

export interface ContactInput {
  subject: string;
  message: string;
  senderName?: string;
  senderEmail?: string;
}

export async function sendContactEmail(input: ContactInput): Promise<void> {
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  const to = env.SUPPORT_EMAIL || env.SENDGRID_FROM_EMAIL;

  const textLines = [
    input.senderName ? `From: ${input.senderName}` : null,
    input.senderEmail ? `Email: ${input.senderEmail}` : null,
    "",
    input.message,
  ].filter((l): l is string => l !== null);

  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  await sgMail.send({
    to,
    from: { email: env.SENDGRID_FROM_EMAIL, name: env.SENDGRID_FROM_NAME },
    ...(input.senderEmail ? { replyTo: input.senderEmail } : {}),
    subject: `[Support] ${input.subject}`,
    text: textLines.join("\n"),
    html: `
      ${input.senderName ? `<p><strong>From:</strong> ${safe(input.senderName)}</p>` : ""}
      ${input.senderEmail ? `<p><strong>Email:</strong> <a href="mailto:${safe(input.senderEmail)}">${safe(input.senderEmail)}</a></p>` : ""}
      <hr/>
      <p style="white-space:pre-wrap">${safe(input.message)}</p>
    `,
  });
}
