import "server-only";

import type { ArticleBlock } from "@/lib/article-blocks";
import { applyStructureSelection } from "@/lib/scrape";
import {
  ZERO_USAGE,
  firstToolInput,
  getClaude,
  usageOf,
  type TokenUsage,
} from "./client";
import { structureArticleBodyTool } from "./schemas";

export type StructuredBody = {
  blocks: ArticleBlock[];
  complete: boolean;
  usage: TokenUsage;
};

// Small output: the model returns one {index, kind} per kept block, not prose.
const MAX_TOKENS = 2048;

// Articles reach us from many sources with wildly different markup, so a fixed
// set of regexes can't reliably tell body prose from chrome, nor a section
// title from a paragraph. The model sees every parsed block (each tagged with
// its HTML-derived guess) and returns the body blocks in reading order with the
// right role, dropping nav, ads, related lists, bios, CTAs and the comment
// thread. The body is rebuilt verbatim from the chosen indices, so downstream
// claim quotes still resolve.
const SYSTEM =
  "You receive the parsed blocks of a scraped news article, one per line, each " +
  "prefixed with its index and a guessed structural role as [index|role]. The " +
  "blocks come straight from the page, so some are not article body: site " +
  "navigation, ads, 'related articles' lists, the author bio, newsletter or " +
  "subscription prompts, social-share widgets, image credits, cookie banners, " +
  "and the reader comment thread (usernames, timestamps, replies). Return only " +
  "the blocks that form the article body, in reading order, each with its " +
  "correct role (heading, subheading, quote, code, para) — fix the guess when " +
  "it is wrong. Never rewrite, merge or summarise text; return indices and " +
  "roles only. A few stray non-body blocks in the middle — a 'related article' " +
  "link, a lone ad or caption that slipped through — are normal: just leave " +
  "them out of your selection and keep bodyComplete true. Only set bodyComplete " +
  "to false when the body as a WHOLE is wrong — cut off mid-article, missing, " +
  "or mostly chrome — so the page can be re-extracted in full.";

function numberBlocks(blocks: ArticleBlock[]): string {
  return blocks
    .map((block, index) => `[${index}|${block.kind}] ${block.text}`)
    .join("\n\n");
}

// Drives the per-article structured extraction. Returns an empty block list when
// nothing qualifies, so the caller can fall back to the deterministic body.
export async function structureArticleBody(
  blocks: ArticleBlock[],
  meta: { title: string },
  model: string,
): Promise<StructuredBody> {
  if (blocks.length === 0) {
    return { blocks: [], complete: true, usage: ZERO_USAGE };
  }

  const client = getClaude();
  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [structureArticleBodyTool],
    tool_choice: { type: "tool", name: "record_article_structure" },
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
            text: `Select and tag the body blocks of the article titled "${meta.title}".`,
          },
        ],
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Article structuring was truncated at max_tokens; the selection is unreliable",
    );
  }

  const input = firstToolInput(message, "record_article_structure");
  // Default to complete when the flag is missing, so a quirk never forces a
  // spurious (paid) whole-page re-extraction.
  const complete =
    typeof input?.bodyComplete === "boolean" ? input.bodyComplete : true;
  return {
    blocks: applyStructureSelection(input?.blocks ?? null, blocks),
    complete,
    usage: usageOf(message),
  };
}
