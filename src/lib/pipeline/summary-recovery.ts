// Some models leak their internal tool-call markup INTO a JSON string value:
// the `summary` string ends with a literal `</summary>` and the whole
// originalSummary follows inline as `<parameter name="originalSummary">…`. The
// SDK still parses valid JSON, but `summary` then carries both fields and
// `originalSummary` comes back empty (see the Chat Control review). Strip the
// stray tags from both fields and, when originalSummary leaked into summary,
// split it back out.
const ORIGINAL_SUMMARY_LEAK = /<parameter\s+name=["']?originalSummary["']?\s*>/i;

function stripLeakedTags(value: string): string {
  return value
    .replace(/<\/?summary\s*>/gi, "")
    .replace(/<\/?parameter\b[^>]*>/gi, "")
    .trim();
}

export function recoverSummaries(
  rawSummary: unknown,
  rawOriginalSummary: unknown,
): { summary: string; originalSummary: string } {
  const summary = typeof rawSummary === "string" ? rawSummary : "";
  let originalSummary =
    typeof rawOriginalSummary === "string" ? rawOriginalSummary : "";

  const leak = summary.match(ORIGINAL_SUMMARY_LEAK);
  if (leak && leak.index !== undefined) {
    const leaked = summary.slice(leak.index + leak[0].length);
    if (!originalSummary.trim()) originalSummary = leaked;
    return {
      summary: stripLeakedTags(summary.slice(0, leak.index)),
      originalSummary: stripLeakedTags(originalSummary),
    };
  }

  return {
    summary: stripLeakedTags(summary),
    originalSummary: stripLeakedTags(originalSummary),
  };
}
