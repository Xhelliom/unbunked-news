// Doit être importé avant ./client pour mapper database-url → DATABASE_URL.
import "./normalize-k8s-env";

import { randomBytes, randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { hashPassword } from "better-auth/crypto";

import { requireAuthSecret } from "../lib/auth-secret";
import { db } from "./client";
import { account, session, user, verification } from "./schema";

// Creates the first admin user. Run once with credentials in the environment:
//   pnpm db:seed-admin "you@example.com" "strong-pw"
// If password is omitted, one is generated automatically for new users.
// Fallback (legacy): ADMIN_EMAIL + ADMIN_PASSWORD still works.
const AUTO_PASSWORD_BYTES = 24;
const AUTO_PASSWORD_ENCODING = "base64url";
const RESET_PASSWORD_FLAG = "--reset-password";
const CREDENTIAL_PROVIDER_ID = "credential";

function generatePassword(): string {
  // base64url avoids shell-hostile characters while keeping good entropy.
  return randomBytes(AUTO_PASSWORD_BYTES).toString(AUTO_PASSWORD_ENCODING);
}

async function main() {
  const cliArguments = process.argv.slice(2);
  const shouldResetPassword = cliArguments.includes(RESET_PASSWORD_FLAG);
  const positionalArguments = cliArguments.filter(
    (argument) => argument !== RESET_PASSWORD_FLAG,
  );
  const cliEmail = positionalArguments[0]?.trim();
  const email = cliEmail || process.env.ADMIN_EMAIL;
  const cliPassword = positionalArguments[1]?.trim();
  const envPassword = process.env.ADMIN_PASSWORD?.trim();
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email) {
    throw new Error("Pass an email as argument (or set ADMIN_EMAIL).");
  }

  // Sign-up is disabled on the app's auth instance, so use a dedicated one
  // (same database and hashing) just for seeding.
  const seedAuth = betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: true },
    secret: requireAuthSecret(),
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  });

  const existingUser = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true, isAdmin: true },
  });

  let generatedPassword: string | null = null;
  let password: string | undefined;

  // Password source policy:
  // - If CLI provides an email but no password, we always generate one so the
  //   operator gets deterministic feedback in stdout.
  // - ADMIN_PASSWORD fallback is kept for legacy usage (no CLI args).
  if (cliPassword) {
    password = cliPassword;
  } else if (!cliEmail && envPassword) {
    password = envPassword;
  } else if (!existingUser || shouldResetPassword) {
    generatedPassword = generatePassword();
    password = generatedPassword;
  }

  if (!existingUser) {
    if (!password) {
      throw new Error(
        "Missing password for new user creation. Pass one inline or via ADMIN_PASSWORD.",
      );
    }
    await seedAuth.api.signUpEmail({ body: { email, password, name } });
  } else if (shouldResetPassword) {
    if (!password) {
      generatedPassword = generatePassword();
      password = generatedPassword;
    }
    if (!password) {
      throw new Error("Missing password while resetting an existing user.");
    }

    const hashedPassword = await hashPassword(password);
    const existingCredentialAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, existingUser.id),
        eq(account.providerId, CREDENTIAL_PROVIDER_ID),
      ),
      columns: { id: true },
    });

    if (existingCredentialAccount) {
      await db
        .update(account)
        .set({ password: hashedPassword })
        .where(eq(account.id, existingCredentialAccount.id));
    } else {
      // Create a local credential account for users that previously had no
      // email/password login (for example OAuth-only accounts).
      await db.insert(account).values({
        id: randomUUID(),
        accountId: email,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: existingUser.id,
        password: hashedPassword,
      });
    }
  }

  // We enforce admin=true even if the user already existed beforehand.
  await db.update(user).set({ isAdmin: true }).where(eq(user.email, email));
  console.log(`Admin role granted: ${email}`);
  if (generatedPassword) {
    console.log(`Generated password: ${generatedPassword}`);
  } else if (existingUser && !cliPassword && !envPassword && !shouldResetPassword) {
    // Clear operator feedback: no account creation happened, so no password was
    // generated in this run.
    console.log(
      "No password generated because this user already exists. Pass one inline only when creating a new user.",
    );
  }
  if (shouldResetPassword) {
    console.log("Password reset applied for existing user.");
  }
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
