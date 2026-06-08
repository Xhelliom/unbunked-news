import assert from "node:assert/strict";
import { test } from "node:test";

import { assertPublicUrl, BlockedUrlError, resolvePinnedUrl } from "./ssrf";

// IP-literal cases only — no DNS, so these stay hermetic (no network).

test("assertPublicUrl allows a public IPv4 literal", async () => {
  assert.equal(await assertPublicUrl("https://8.8.8.8/"), "https://8.8.8.8/");
});

test("assertPublicUrl rejects loopback and private IPv4 literals", async () => {
  for (const url of [
    "http://127.0.0.1/",
    "http://127.0.0.1:5432/",
    "http://10.0.0.5/",
    "http://172.16.4.4/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://0.0.0.0/",
  ]) {
    await assert.rejects(assertPublicUrl(url), BlockedUrlError, url);
  }
});

test("assertPublicUrl rejects loopback/link-local IPv6 literals", async () => {
  for (const url of [
    "http://[::1]/",
    "http://[fe80::1]/",
    "http://[fc00::1]/",
    "http://[::ffff:127.0.0.1]/", // IPv4-mapped loopback
  ]) {
    await assert.rejects(assertPublicUrl(url), BlockedUrlError, url);
  }
});

test("assertPublicUrl rejects non-http(s) schemes", async () => {
  await assert.rejects(assertPublicUrl("file:///etc/passwd"), BlockedUrlError);
  await assert.rejects(assertPublicUrl("ftp://8.8.8.8/"), BlockedUrlError);
  await assert.rejects(assertPublicUrl("not a url"), BlockedUrlError);
});

test("resolvePinnedUrl returns the validated URL and a dispatcher", async () => {
  const target = await resolvePinnedUrl("https://8.8.8.8/");
  try {
    assert.equal(target.url, "https://8.8.8.8/");
    assert.ok(target.dispatcher);
  } finally {
    await target.dispatcher.close();
  }
});

test("resolvePinnedUrl rejects private and non-http(s) targets", async () => {
  for (const url of [
    "http://127.0.0.1:5432/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "file:///etc/passwd",
  ]) {
    await assert.rejects(resolvePinnedUrl(url), BlockedUrlError, url);
  }
});
