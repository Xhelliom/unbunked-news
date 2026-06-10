import "server-only";

import type { ScrapedArticle } from "@/lib/scrape";
import {
  firstToolInput,
  formatArticle,
  getClaude,
  usageOf,
  type TokenUsage,
} from "./client";
import { toolCallDiagnostic, type StepDiagnostic } from "./diagnostics";
import { clampMaxClaims, DEFAULT_MAX_CLAIMS } from "./limits";
import { recordClaimsTool } from "./schemas";

// 3-8 short claim sentences fit easily; the headroom only guards against a
// pathological article producing a long list and getting cut off mid-array.
const MAX_TOKENS = 4096;

export type ExtractClaimsResult = {
  claims: string[];
  usage: TokenUsage;
  diagnostic: StepDiagnostic;
};

const SYSTEM =
  "You are a rigorous fact-checking assistant. You isolate the concrete, " +
  "checkable factual claims in a news article — statements that can be " +
  "verified against external sources. Ignore opinions, framing, and rhetoric. " +
  "Prefer 3-8 of the most consequential claims. Write each claim in the same " +
  "language as the article; never translate.";

export async function extractClaims(
  article: ScrapedArticle,
  model: string,
  maxClaims: number = DEFAULT_MAX_CLAIMS,
): Promise<ExtractClaimsResult> {
  // A page crafted to induce a long list would otherwise multiply every
  // downstream reasoning call (verify/assess) and the per-claim DB writes, so
  // the list is truncated after filtering. The cap is admin-tunable for a long
  // article (see the preflight pause) but stays bounded by clampMaxClaims.
  const cap = clampMaxClaims(maxClaims);
  const client = getClaude();
  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [recordClaimsTool],
    tool_choice: { type: "tool", name: "record_claims" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: formatArticle(article),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: "Extract the checkable factual claims from the article above.",
          },
        ],
      },
    ],
  });

  const input = firstToolInput(message, "record_claims");
  const rawClaims = Array.isArray(input?.claims) ? input.claims : [];
  const filtered = rawClaims.filter(
    (claim): claim is string =>
      typeof claim === "string" && claim.trim().length > 0,
  );
  const claims = filtered.slice(0, cap);

  const dropped = rawClaims.length - filtered.length;
  const capped = filtered.length - claims.length;
  const warnings: string[] = [];
  if (!input) warnings.push("record_claims tool was not called");
  if (claims.length === 0) warnings.push("no claims extracted");
  if (dropped > 0) warnings.push(`${dropped} malformed/empty claim(s) dropped`);
  if (capped > 0) warnings.push(`${capped} claim(s) over the ${cap} cap dropped`);

  const diagnostic = toolCallDiagnostic(
    "extracting",
    model,
    message,
    { claims: claims.length, dropped },
    warnings,
  );
  return { claims, usage: usageOf(message), diagnostic };
}
