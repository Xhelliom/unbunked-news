// Protocol-only guard for URLs that originate from untrusted sources (scraped
// pages, LLM-returned source links, proposed article URLs). It strips anything
// that isn't a real http(s) URL so a `javascript:`/`data:` payload can never
// reach an `href` or `<img src>`. Pure (no DNS, no server-only) so render
// components and server modules alike can import it. SSRF address filtering
// lives in `@/lib/ssrf` — this only vets the scheme/shape.
export function safeHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
