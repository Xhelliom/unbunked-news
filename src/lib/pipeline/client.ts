import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { ScrapedArticle } from "@/lib/scrape";

export const MODEL = "claude-haiku-4-5-20251001";

// Bound the article body so a single very long page can't blow up token usage.
const MAX_CONTENT_CHARS = 16_000;

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  client ??= new Anthropic();
  return client;
}

// Stable, cacheable representation of the article reused across pipeline phases.
export function formatArticle(article: ScrapedArticle): string {
  const body = article.content.slice(0, MAX_CONTENT_CHARS);
  return [
    `URL: ${article.url}`,
    `SOURCE: ${article.sourceName}`,
    `TITLE: ${article.title}`,
    "",
    "ARTICLE:",
    body,
  ].join("\n");
}

export function firstToolInput(
  message: Anthropic.Message,
  toolName: string,
): Record<string, unknown> | null {
  for (const block of message.content) {
    if (block.type === "tool_use" && block.name === toolName) {
      return block.input as Record<string, unknown>;
    }
  }
  return null;
}

export function collectText(message: Anthropic.Message): string {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as Anthropic.TextBlock).text)
    .join("\n");
}
