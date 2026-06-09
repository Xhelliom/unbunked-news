import "server-only";

// Cloudflare Turnstile verification, done with a plain fetch (no SDK). Optional:
// when the keys aren't configured the check is a no-op pass, so contribution
// submission works without Turnstile and gains protection once keys are set.

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY &&
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  );
}

export async function verifyTurnstile(
  token: string | null,
  ip: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  // Disabled: treat as passed so the submission flow is unaffected.
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }
  const body = new URLSearchParams({ secret, response: token });
  if (ip) {
    body.set("remoteip", ip);
  }
  const response = await fetch(SITEVERIFY_URL, { method: "POST", body });
  if (!response.ok) {
    return false;
  }
  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}
