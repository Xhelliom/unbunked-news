import type { TokenUsage } from "./client";

const TOKENS_PER_MILLION = 1_000_000;

type ModelPricing = {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
};

// USD per million tokens. Anthropic bills in USD; the ephemeral (5-minute) cache
// write is 1.25x the input rate and a cache read is 0.1x the input rate.
const HAIKU_4_5_PRICING: ModelPricing = {
  inputPerMtok: 1.0,
  outputPerMtok: 5.0,
  cacheWritePerMtok: 1.25,
  cacheReadPerMtok: 0.1,
};

const PRICING_USD: Record<string, ModelPricing> = {
  "claude-haiku-4-5-20251001": HAIKU_4_5_PRICING,
};

// An unknown model still gets a defensible estimate rather than a zero cost.
const FALLBACK_PRICING = HAIKU_4_5_PRICING;

export function costForUsage(model: string, usage: TokenUsage): number {
  const pricing = PRICING_USD[model] ?? FALLBACK_PRICING;
  const microcost =
    usage.inputTokens * pricing.inputPerMtok +
    usage.outputTokens * pricing.outputPerMtok +
    usage.cacheCreationTokens * pricing.cacheWritePerMtok +
    usage.cacheReadTokens * pricing.cacheReadPerMtok;
  return microcost / TOKENS_PER_MILLION;
}

const SEARCHES_PER_UNIT = 1_000;

// USD per 1000 web search requests, billed separately from tokens. Native
// Anthropic search is ~$10 / 1000; cheaper external providers extend this map
// as they are wired in. Keyed by the stored search_provider string.
const SEARCH_PRICE_PER_UNIT_USD: Record<string, number> = {
  anthropic: 10.0,
};

// An unknown provider still gets a defensible estimate rather than a zero cost.
const FALLBACK_SEARCH_PRICE_PER_UNIT_USD = SEARCH_PRICE_PER_UNIT_USD.anthropic;

export function costForSearch(provider: string, requests: number): number {
  const perUnit =
    SEARCH_PRICE_PER_UNIT_USD[provider] ?? FALLBACK_SEARCH_PRICE_PER_UNIT_USD;
  return (requests * perUnit) / SEARCHES_PER_UNIT;
}
