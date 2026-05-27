import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/db/client";
import { account, session, user, verification } from "@/db/schema";

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
  // Required in production — set via env (k8s secret / .env). The fallback only
  // keeps `next build` from failing when the secret isn't present at build time.
  secret: process.env.BETTER_AUTH_SECRET ?? "unbunked-dev-secret-please-override",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  // nextCookies must be the last plugin so it can set cookies on responses.
  plugins: [nextCookies()],
});
