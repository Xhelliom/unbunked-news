import { sql } from "drizzle-orm";

import { articles } from "@/db/schema";

// Full-text search fragments over the Postgres-maintained `search_vector`
// (title + summary + body, french config). Drizzle has no builder for
// `plainto_tsquery`/`ts_rank`, so raw `sql` is used here as the documented
// exception (CLAUDE.md): identifiers go through the Drizzle schema objects and
// the user query is always parameterised. Kept free of `server-only` so the
// generated SQL can be asserted in search-query.test.ts (rendered via PgDialect,
// no DB connection).
export function searchMatchSql(query: string) {
  return sql`${articles.searchVector} @@ plainto_tsquery('french', ${query})`;
}

export function searchRankSql(query: string) {
  return sql`ts_rank(${articles.searchVector}, plainto_tsquery('french', ${query}))`;
}
