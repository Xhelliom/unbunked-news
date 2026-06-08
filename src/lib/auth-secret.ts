// Resolves the BetterAuth signing secret, failing fast when it is missing at
// runtime. A silent fallback to a hard-coded value would let the app boot with a
// publicly known secret and let anyone forge admin sessions. The only exception
// is `next build`, which evaluates server modules without runtime env present.
const BUILD_PHASE = "phase-production-build";
const BUILD_PLACEHOLDER = "unbunked-build-time-placeholder";

export function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NEXT_PHASE === BUILD_PHASE) return BUILD_PLACEHOLDER;
  throw new Error("BETTER_AUTH_SECRET is not set");
}
