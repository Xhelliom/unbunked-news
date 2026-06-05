import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { requireAuthSecret } from "@/lib/auth-secret";

const isProduction = process.env.NODE_ENV === "production";
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Admin-only platform: no public registration. The first admin is created
    // with the `db:seed-admin` script.
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  // Required at runtime — set via env (k8s secret / .env). Fails fast if missing
  // outside the build, instead of silently signing sessions with a public secret.
  secret: requireAuthSecret(),
  baseURL,
  // Lock CSRF origin validation to the configured origin in production rather
  // than relying on the localhost fallback.
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
  // Turn on better-auth's rate limiting (off in dev by default). Its built-in
  // special rules already cap the sensitive endpoints — sign-in to 3/10s — which
  // is what we need to blunt brute force; no custom rules required.
  rateLimit: {
    enabled: true,
  },
  advanced: {
    // Force the __Secure- cookie prefix + Secure attribute in production.
    useSecureCookies: isProduction,
  },
  // nextCookies must be the last plugin so it can set cookies on responses.
  plugins: [nextCookies()],
});
