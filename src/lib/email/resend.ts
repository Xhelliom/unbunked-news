import "server-only";

import { Resend } from "resend";

import {
  renderPasswordResetEmail,
  renderVerificationEmail,
  type EmailContent,
} from "./templates";

// Lazy singleton, mirroring getClaude(): the key is only needed when an email is
// actually sent, so the build (and any env-less context) never touches it.
let client: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set");
  }
  client ??= new Resend(key);
  return client;
}

function fromAddress(): string {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set");
  }
  return from;
}

async function send(to: string, content: EmailContent): Promise<void> {
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  // Surface delivery failures loudly: a swallowed error here means a user never
  // receives their verification / reset link and silently can't proceed.
  if (error) {
    throw new Error(`Resend failed to send email: ${error.message}`);
  }
}

export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  await send(to, renderVerificationEmail(verifyUrl));
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  await send(to, renderPasswordResetEmail(resetUrl));
}
