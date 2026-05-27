import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

// `next build` evaluates server modules (incl. the auth route) without runtime
// env. Postgres.js connects lazily, so a placeholder during build is never used
// for a real connection; a real DATABASE_URL is still required at runtime.
const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NEXT_PHASE === "phase-production-build"
    ? "postgresql://build:build@127.0.0.1:5432/build"
    : undefined);

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Reuse a single client across hot reloads in dev to avoid exhausting Postgres.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client = globalForDb.client ?? postgres(connectionString);
if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

// Node-safe Drizzle instance (usable from scripts and the BetterAuth CLI).
export const db = drizzle(client, { schema, casing: "snake_case" });
