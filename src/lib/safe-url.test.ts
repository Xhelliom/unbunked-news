import assert from "node:assert/strict";
import { test } from "node:test";

import { safeHttpUrl } from "./safe-url";

test("safeHttpUrl keeps http and https URLs", () => {
  assert.equal(
    safeHttpUrl("https://example.com/a?b=1"),
    "https://example.com/a?b=1",
  );
  assert.equal(safeHttpUrl("http://example.com/"), "http://example.com/");
  assert.equal(safeHttpUrl("  https://example.com  "), "https://example.com/");
});

test("safeHttpUrl rejects dangerous and non-http schemes", () => {
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("data:text/html,<script>"), null);
  assert.equal(safeHttpUrl("file:///etc/passwd"), null);
  assert.equal(safeHttpUrl("not a url"), null);
  assert.equal(safeHttpUrl(""), null);
  assert.equal(safeHttpUrl(null), null);
  assert.equal(safeHttpUrl(undefined), null);
});
