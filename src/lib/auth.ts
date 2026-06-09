import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";
import { requireAuthSecret } from "@/lib/auth-secret";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email/send";
import { getAppSettings } from "@/lib/settings";

const isProduction = process.env.NODE_ENV === "production";
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const SESSION_UPDATE_AGE_SECONDS = 60 * 60 * 24;
const MIN_PASSWORD_LENGTH = 8;

// Google is only wired when both credentials are present, so a deployment that
// hasn't configured OAuth still builds and runs (email/password only).
function socialProviders() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return undefined;
  }
  return { google: { clientId, clientSecret } };
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Account creation is gated at runtime by the publicSignupEnabled setting
    // (see databaseHooks below), so the static switch stays open.
    disableSignUp: false,
    requireEmailVerification: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    sendResetPassword: async ({ user: target, url }) => {
      await sendPasswordResetEmail(target.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: target, url }) => {
      await sendVerificationEmail(target.email, url);
    },
  },
  socialProviders: socialProviders(),
  databaseHooks: {
    user: {
      create: {
        // Single gate covering both email and Google sign-up. Admin accounts are
        // created by direct DB insert (seed-admin / members), bypassing this hook.
        before: async (newUser) => {
          const { publicSignupEnabled } = await getAppSettings();
          if (!publicSignupEnabled) {
            throw new APIError("BAD_REQUEST", {
              message: "Public sign-up is disabled.",
            });
          }
          return { data: newUser };
        },
      },
    },
  },
  session: {
    expiresIn: SESSION_EXPIRES_IN_SECONDS,
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },
  // Required at runtime — set via env (k8s secret / .env). Fails fast if missing
  // outside the build, instead of silently signing sessions with a public secret.
  secret: requireAuthSecret(),
  // CSRF origin validation trusts this origin automatically, so the only thing
  // that matters is setting BETTER_AUTH_URL to the real origin in production
  // (https://unbunked.news). Add a `trustedOrigins` list only to allow extra
  // origins (e.g. a www subdomain not handled by an ingress redirect).
  baseURL,
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
