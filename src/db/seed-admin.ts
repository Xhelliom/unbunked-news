import "dotenv/config";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./client";
import { account, session, user, verification } from "./schema";

// Creates the first admin user. Run once with credentials in the environment:
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='strong-pw' pnpm db:seed-admin
async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD to seed the admin user.",
    );
  }

  // Sign-up is disabled on the app's auth instance, so use a dedicated one
  // (same database and hashing) just for seeding.
  const seedAuth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    secret:
      process.env.BETTER_AUTH_SECRET ?? "unbunked-dev-secret-please-override",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  });

  await seedAuth.api.signUpEmail({ body: { email, password, name } });
  console.log(`Admin user created: ${email}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Failed to seed admin:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
