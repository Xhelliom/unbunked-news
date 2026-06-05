import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { requireAuthSecret } from "@/lib/auth-secret";

const isProduction = process.env.NODE_ENV === "production";
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

// Login is the only unauthenticated mutation (sign-up is disabled). Keep a
// generous global cap on the auth endpoints and a tight rule on the email
// sign-in path specifically, to blunt credential-stuffing/brute force without
// throttling ordinary session traffic. (better-auth also applies its own
// default special rules on sensitive paths.)
const AUTH_WINDOW_SECONDS = 60;
const AUTH_MAX_REQUESTS = 100;
const LOGIN_MAX_ATTEMPTS = 10;

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
  rateLimit: {
    enabled: true,
    window: AUTH_WINDOW_SECONDS,
    max: AUTH_MAX_REQUESTS,
    customRules: {
      "/sign-in/email": { window: AUTH_WINDOW_SECONDS, max: LOGIN_MAX_ATTEMPTS },
    },
  },
  advanced: {
    // Force the __Secure- cookie prefix + Secure attribute in production.
    useSecureCookies: isProduction,
  },
  // nextCookies must be the last plugin so it can set cookies on responses.
  plugins: [nextCookies()],
});
