import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import type { ScrapedArticle } from "@/lib/scrape";

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

// Token counts captured from a Claude response so the pipeline can report the
// AI cost of each article. Cache tokens are tracked separately because they are
// billed at a different rate (see pricing.ts).
export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
};

export const ZERO_USAGE: TokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
};

export function usageOf(message: Anthropic.Message): TokenUsage {
  const { usage } = message;
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  };
}

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}
