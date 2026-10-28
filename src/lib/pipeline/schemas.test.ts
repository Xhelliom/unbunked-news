import assert from "node:assert/strict";
import { test } from "node:test";

import type Anthropic from "@anthropic-ai/sdk";

import { SCORE_CRITERIA } from "@/lib/score-criteria";

import {
  analysisMetaOutputFormat,
  CRITERIA_CHUNKS,
  criteriaOutputFormat,
} from "./schemas";

// The API refused the single 64-property / 59-enum-value analysis schema with
// "compiled grammar is too large"; each half must stay well below that.
const MAX_PROPERTIES = 30;
const MAX_ENUM_VALUES = 30;

type SchemaSize = { properties: number; enumValues: number };

function measure(node: unknown): SchemaSize {
  const size: SchemaSize = { properties: 0, enumValues: 0 };
  if (Array.isArray(node)) {
    for (const child of node) {
      const inner = measure(child);
      size.properties += inner.properties;
      size.enumValues += inner.enumValues;
    }
    return size;
  }
  if (node === null || typeof node !== "object") return size;
  for (const [key, value] of Object.entries(node)) {
    if (key === "properties" && value && typeof value === "object") {
      size.properties += Object.keys(value).length;
    }
    if (key === "enum" && Array.isArray(value)) {
      size.enumValues += value.length;
    }
    const inner = measure(value);
    size.properties += inner.properties;
    size.enumValues += inner.enumValues;
  }
  return size;
}

const FORMATS: [string, Anthropic.JSONOutputFormat][] = [
  ...CRITERIA_CHUNKS.map(
    (chunk, i): [string, Anthropic.JSONOutputFormat] => [
      `criteria chunk ${i + 1}`,
      criteriaOutputFormat(chunk),
    ],
  ),
  ["analysis meta", analysisMetaOutputFormat],
];

test("every criterion is recorded by exactly one chunk", () => {
  assert.deepEqual([...CRITERIA_CHUNKS.flat()], [...SCORE_CRITERIA]);
});

for (const [name, format] of FORMATS) {
  test(`${name} output schema stays within the grammar budget`, () => {
    const size = measure(format.schema);
    assert.ok(size.properties <= MAX_PROPERTIES, `${size.properties} properties`);
    assert.ok(size.enumValues <= MAX_ENUM_VALUES, `${size.enumValues} enum values`);
  });
}
