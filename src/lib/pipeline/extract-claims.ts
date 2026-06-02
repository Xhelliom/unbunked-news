import "server-only";

import type { ScrapedArticle } from "@/lib/scrape";
import {
  firstToolInput,
  formatArticle,
  getClaude,
  usageOf,
  type TokenUsage,
} from "./client";
import { recordClaimsTool } from "./schemas";

export type ExtractClaimsResult = {
  claims: string[];
  usage: TokenUsage;
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
): Promise<ExtractClaimsResult> {
  const client = getClaude();
  const message = await client.messages.create({
    model,
    max_tokens: 2048,
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
  const claims = rawClaims.filter(
    (claim): claim is string =>
      typeof claim === "string" && claim.trim().length > 0,
  );
  return { claims, usage: usageOf(message) };
}
