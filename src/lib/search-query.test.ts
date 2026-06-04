import { test } from "node:test";
import assert from "node:assert/strict";

import { PgDialect } from "drizzle-orm/pg-core";

import { searchMatchSql, searchRankSql } from "./search-query";

const dialect = new PgDialect();

test("match fragment tests search_vector against a french plainto_tsquery", () => {
  const { sql, params } = dialect.sqlToQuery(searchMatchSql("dette publique"));
  assert.ok(sql.includes("search_vector"));
  assert.ok(sql.includes("@@"));
  assert.ok(sql.includes("plainto_tsquery('french', $1)"));
  assert.deepEqual(params, ["dette publique"]);
});

test("rank fragment ranks with ts_rank over search_vector", () => {
  const { sql, params } = dialect.sqlToQuery(searchRankSql("openai"));
  assert.ok(sql.includes("ts_rank("));
  assert.ok(sql.includes("search_vector"));
  assert.ok(sql.includes("plainto_tsquery('french', $1)"));
  assert.deepEqual(params, ["openai"]);
});

test("the user query is parameterised, never inlined (injection-safe)", () => {
  const evil = "'; drop table articles; --";
  const { sql, params } = dialect.sqlToQuery(searchMatchSql(evil));
  assert.ok(!sql.toLowerCase().includes("drop table"));
  assert.deepEqual(params, [evil]);
});
