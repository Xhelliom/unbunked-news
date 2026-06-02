import "dotenv/config";

import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./client";
import { account, session, user, verification } from "./schema";

// Creates the first admin user. Run once with credentials in the environment:
//   ADMIN_PASSWORD='strong-pw' pnpm db:seed-admin "you@example.com"
// Fallback (legacy): ADMIN_EMAIL + ADMIN_PASSWORD still works.
async function main() {
  const cliEmail = process.argv[2]?.trim();
  const email = cliEmail || process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    throw new Error(
      "Set ADMIN_PASSWORD and pass an email as argument (or ADMIN_EMAIL).",
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

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true, isAdmin: true },
  });

  if (!existingUser) {
    await seedAuth.api.signUpEmail({ body: { email, password, name } });
  }

  // We enforce admin=true even if the user already existed beforehand.
  await db.update(user).set({ isAdmin: true }).where(eq(user.email, email));
  console.log(`Admin role granted: ${email}`);
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
