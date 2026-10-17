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

test("Haiku 5.5 is priced at its list rates", () => {
  // input 0.1 + output 0.5 + cache write 0.125 + cache read 0.01
  approx(costForUsage(HAIKU_MODEL, ONE_MTOK_EACH), 0.735);
});

test("Sonnet 5.5 is priced at its list rates", () => {
  // input 2.0 + output 10.0 + cache write 2.5 + cache read 0.2
  approx(costForUsage(SONNET_MODEL, ONE_MTOK_EACH), 14.7);
});

test("past runs keep the rates of the model they ran on", () => {
  // Haiku 4.5: 1.0 + 5.0 + 1.25 + 0.1; Sonnet 5: 2.0 + 10.0 + 2.5 + 0.2
  approx(costForUsage("claude-haiku-4-5-20251001", ONE_MTOK_EACH), 7.35);
  approx(costForUsage("claude-sonnet-5", ONE_MTOK_EACH), 14.7);
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
  approx(haikuRow, 0.05); // 0.5 Mtok × $0.1
  approx(sonnetRow, 1.0); // 0.5 Mtok × $2
  approx(haikuRow + sonnetRow, 1.05);
});
