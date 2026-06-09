import "server-only";

import {
  renderPasswordResetEmail,
  renderVerificationEmail,
  type EmailContent,
} from "./templates";
import { sendViaResend } from "./resend";
import { sendViaSmtp } from "./smtp";

// Source of truth for the supported providers. Resend is the default (HTTP API,
// no SMTP egress needed); smtp covers any relay, including Brevo.
const EMAIL_PROVIDERS = ["resend", "smtp"] as const;
type EmailProvider = (typeof EMAIL_PROVIDERS)[number];
const DEFAULT_PROVIDER: EmailProvider = "resend";

type EmailTransport = (to: string, content: EmailContent) => Promise<void>;

const TRANSPORTS: Record<EmailProvider, EmailTransport> = {
  resend: sendViaResend,
  smtp: sendViaSmtp,
};

function resolveProvider(): EmailProvider {
  const raw = process.env.EMAIL_PROVIDER?.toLowerCase();
  if (!raw) {
    return DEFAULT_PROVIDER;
  }
  if ((EMAIL_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as EmailProvider;
  }
  throw new Error(
    `Unknown EMAIL_PROVIDER "${raw}" (expected one of: ${EMAIL_PROVIDERS.join(", ")})`,
  );
}

async function send(to: string, content: EmailContent): Promise<void> {
  await TRANSPORTS[resolveProvider()](to, content);
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
