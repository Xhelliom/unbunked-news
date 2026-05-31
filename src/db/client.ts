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

// Pool sizing: with N web replicas, max * N must stay below Postgres
// max_connections. Tune DATABASE_POOL_MAX (or front the DB with PgBouncer)
// before raising the deployment's replica count.
const DEFAULT_DB_POOL_MAX = 10;
// postgres.js expects these timeouts in SECONDS, not milliseconds.
const DB_IDLE_TIMEOUT_SECONDS = 20;
const DB_CONNECT_TIMEOUT_SECONDS = 10;

function resolvePoolMax(): number {
  const raw = process.env.DATABASE_POOL_MAX;
  if (raw === undefined) {
    return DEFAULT_DB_POOL_MAX;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_DB_POOL_MAX;
}

// Reuse a single client across hot reloads in dev to avoid exhausting Postgres.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: resolvePoolMax(),
    idle_timeout: DB_IDLE_TIMEOUT_SECONDS,
    connect_timeout: DB_CONNECT_TIMEOUT_SECONDS,
  });
if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

// Node-safe Drizzle instance (usable from scripts and the BetterAuth CLI).
export const db = drizzle(client, { schema, casing: "snake_case" });
