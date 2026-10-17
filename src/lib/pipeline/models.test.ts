import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_REASONING_MODEL,
  HAIKU_MODEL,
  LEGACY_HAIKU_4_5_MODEL,
  LEGACY_SONNET_5_MODEL,
  SONNET_MODEL,
  toReasoningModel,
} from "./models";

test("a current reasoning model is kept as picked", () => {
  assert.equal(toReasoningModel(HAIKU_MODEL), HAIKU_MODEL);
  assert.equal(toReasoningModel(SONNET_MODEL), SONNET_MODEL);
});

test("a job queued on a previous-generation model runs on its successor", () => {
  assert.equal(toReasoningModel(LEGACY_HAIKU_4_5_MODEL), HAIKU_MODEL);
  assert.equal(toReasoningModel(LEGACY_SONNET_5_MODEL), SONNET_MODEL);
});

test("an unknown or missing model falls back to the default tier", () => {
  assert.equal(toReasoningModel("claude-unknown"), DEFAULT_REASONING_MODEL);
  assert.equal(toReasoningModel(null), DEFAULT_REASONING_MODEL);
});
