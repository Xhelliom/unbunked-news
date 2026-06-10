import assert from "node:assert/strict";
import { test } from "node:test";

import { lintRewriteBody } from "./rewrite-lint";

test("lintRewriteBody accepts in-range claim anchors and http links", () => {
  const body = "See [[claim:1]] and [[claim:3]]. More on [the site](https://example.com).";
  assert.deepEqual(lintRewriteBody(body, 3), []);
});

test("lintRewriteBody flags out-of-range and malformed claim anchors", () => {
  const warnings = lintRewriteBody("[[claim:5]] then [[claim:0]] then [[claim:x]]", 3);
  assert.deepEqual(warnings, [
    { kind: "claimOutOfRange", number: 5 },
    { kind: "claimOutOfRange", number: 0 },
    { kind: "claimMalformed", raw: "[[claim:x]]" },
  ]);
});

test("lintRewriteBody flags links the renderer won't linkify", () => {
  const warnings = lintRewriteBody("[x](javascript:alert(1)) and [y](https://ok.com)", 0);
  assert.deepEqual(warnings, [{ kind: "badLink", target: "javascript:alert(1" }]);
});
