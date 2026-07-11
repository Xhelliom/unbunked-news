import { test } from "node:test";
import assert from "node:assert/strict";

import { costForUsage } from "./pricing";
import { HAIKU_MODEL, SONNET_MODEL } from "./models";

// One million of each token kind makes the per-Mtok rates fall out directly:
// the cost in USD equals input + output + cacheWrite + cacheRead per Mtok.
const ONE_MTOK_EACH = {
  inputTokens: 1_000_000,
  outputTokens: 1_000_000,
  cacheCreationTokens: 1_000_000,
  cacheReadTokens: 1_000_000,
};

function approx(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < 1e-9,
    `expected ${expected}, got ${actual}`,
  );
}

test("Haiku 4.5 is priced at its list rates", () => {
  // input 1.0 + output 5.0 + cache write 1.25 + cache read 0.1
  approx(costForUsage(HAIKU_MODEL, ONE_MTOK_EACH), 7.35);
});

test("Sonnet 5 is priced at its list rates", () => {
  // input 3.0 + output 15.0 + cache write 3.75 + cache read 0.3
  approx(costForUsage(SONNET_MODEL, ONE_MTOK_EACH), 22.05);
});

test("an unknown model falls back to the Haiku rate, never zero", () => {
  approx(
    costForUsage("some-unreleased-model", ONE_MTOK_EACH),
    costForUsage(HAIKU_MODEL, ONE_MTOK_EACH),
  );
});

test("a tiered run prices each model's row independently then sums", () => {
  // Mirrors the cost page: Haiku row for extraction + Sonnet row for judgement.
  const haikuRow = costForUsage(HAIKU_MODEL, {
    inputTokens: 500_000,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });
  const sonnetRow = costForUsage(SONNET_MODEL, {
    inputTokens: 500_000,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });
  approx(haikuRow, 0.5); // 0.5 Mtok × $1
  approx(sonnetRow, 1.5); // 0.5 Mtok × $3
  approx(haikuRow + sonnetRow, 2.0);
});
