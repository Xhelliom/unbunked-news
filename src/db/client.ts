import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as contributionsSchema from "./contributions-schema";
import * as schema from "./schema";

// contributions-schema FKs into articles/claims (schema.ts), so it imports from
// schema rather than being re-exported by it — merging both module namespaces
// here keeps that dependency one-directional (no circular import) while still
// registering the contributions tables and relations for db.query.
const fullSchema = { ...schema, ...contributionsSchema };

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

// Postgres.js TLS mode, set explicitly so the connection isn't silently
// plaintext when DATABASE_URL omits `sslmode`. Driven by DATABASE_SSL (e.g.
// `require`, `verify-full`) and left unset by default so local/dev Postgres
// without TLS keeps working unchanged. A `sslmode` in DATABASE_URL still wins
// when this is unset.
type SslOption = "require" | "prefer" | "verify-full" | undefined;

function resolveSslOption(): SslOption {
  const mode = process.env.DATABASE_SSL?.trim().toLowerCase();
  if (mode === "require" || mode === "prefer" || mode === "verify-full") {
    return mode;
  }
  return undefined;
}

// Reuse a single client across hot reloads in dev to avoid exhausting Postgres.
const globalForDb = globalThis as unknown as {
  client?: ReturnType<typeof postgres>;
};

const sslOption = resolveSslOption();
const client =
  globalForDb.client ??
  postgres(connectionString, {
    max: resolvePoolMax(),
    idle_timeout: DB_IDLE_TIMEOUT_SECONDS,
    connect_timeout: DB_CONNECT_TIMEOUT_SECONDS,
    ...(sslOption ? { ssl: sslOption } : {}),
  });
if (process.env.NODE_ENV !== "production") {
  globalForDb.client = client;
}

// Node-safe Drizzle instance (usable from scripts and the BetterAuth CLI).
export const db = drizzle(client, { schema: fullSchema, casing: "snake_case" });
