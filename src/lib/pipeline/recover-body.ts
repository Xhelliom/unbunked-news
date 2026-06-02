import "server-only";

import {
  firstToolInput,
  getClaude,
  MODEL,
  usageOf,
  type TokenUsage,
} from "./client";
import { selectArticleBodyTool } from "./schemas";

export type RecoveredBody = { content: string; usage: TokenUsage };

const MAX_TOKENS = 1024;

const SYSTEM =
  "You receive the text blocks of a scraped news web page, each prefixed with " +
  "its index in [brackets]. A generic extractor failed on this page — it " +
  "grabbed site chrome (a paywall teaser, a navigation menu) instead of the " +
  "article. Identify the blocks that are the actual article body, in reading " +
  "order. Return only their indices; never rewrite or summarise the text.";

function numberBlocks(blocks: string[]): string {
  return blocks.map((block, index) => `[${index}] ${block}`).join("\n\n");
}

// Keep only in-range, integer, deduplicated indices: Claude can return out-of-
// bounds or repeated values, and we slice the original blocks by them verbatim.
function selectedIndices(
  input: Record<string, unknown> | null,
  count: number,
): number[] {
  const raw = Array.isArray(input?.indices) ? input.indices : [];
  const seen = new Set<number>();
  const indices: number[] = [];
  for (const value of raw) {
    if (
      Number.isInteger(value) &&
      (value as number) >= 0 &&
      (value as number) < count &&
      !seen.has(value as number)
    ) {
      seen.add(value as number);
      indices.push(value as number);
    }
  }
  return indices;
}

// Recovers the article body from the page's candidate text blocks when the
// generic extractor mis-selected site chrome. The body is rebuilt verbatim from
// the chosen blocks (Claude returns indices, not prose) so downstream claim
// quotes still resolve against it. Returns an empty body if nothing qualifies.
export async function recoverArticleBody(
  blocks: string[],
  meta: { title: string },
): Promise<RecoveredBody> {
  const client = getClaude();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [selectArticleBodyTool],
    tool_choice: { type: "tool", name: "select_article_body" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: numberBlocks(blocks),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `Select the blocks that form the body of the article titled "${meta.title}".`,
          },
        ],
      },
    ],
  });

  const input = firstToolInput(message, "select_article_body");
  const indices = selectedIndices(input, blocks.length);
  const content = indices.map((index) => blocks[index]).join("\n\n");
  return { content, usage: usageOf(message) };
}
