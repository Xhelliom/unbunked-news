import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

import type { EmailContent } from "./templates";

// 587 negotiates STARTTLS (the common relay port); 465 wraps the whole session
// in TLS. Brevo, Mailgun, Gmail, Postfix… all speak one of these.
const DEFAULT_SMTP_PORT = 587;
const IMPLICIT_TLS_PORT = 465;

// Lazy singleton, like the Resend client: SMTP credentials are only resolved
// when an email is actually sent, so the build never touches them.
let transporter: Transporter | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function getTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }
  const port = Number(process.env.SMTP_PORT ?? String(DEFAULT_SMTP_PORT));
  transporter = nodemailer.createTransport({
    host: requireEnv("SMTP_HOST"),
    port,
    secure: port === IMPLICIT_TLS_PORT,
    auth: {
      user: requireEnv("SMTP_USER"),
      pass: requireEnv("SMTP_PASSWORD"),
    },
  });
  return transporter;
}

// Generic SMTP transport. Selected by send.ts when EMAIL_PROVIDER=smtp. For
// Brevo, point SMTP_HOST at smtp-relay.brevo.com and use the relay credentials.
// nodemailer throws on a failed send, which propagates loudly by design.
export async function sendViaSmtp(
  to: string,
  content: EmailContent,
): Promise<void> {
  await getTransporter().sendMail({
    from: requireEnv("SMTP_FROM"),
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
}
