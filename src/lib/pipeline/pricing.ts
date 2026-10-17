import type { TokenUsage } from "./client";
import {
  HAIKU_MODEL,
  LEGACY_HAIKU_4_5_MODEL,
  LEGACY_SONNET_5_MODEL,
  SONNET_MODEL,
} from "./models";

const TOKENS_PER_MILLION = 1_000_000;

type ModelPricing = {
  inputPerMtok: number;
  outputPerMtok: number;
  cacheWritePerMtok: number;
  cacheReadPerMtok: number;
};

// USD per million tokens. Anthropic bills in USD; the ephemeral (5-minute) cache
// write is 1.25x the input rate and a cache read is 0.1x the input rate.
// Haiku 5.5 has a second, 5x rate card for prompts over 100k tokens. Usage is
// summed per model before pricing, so the base card is applied throughout: a
// Haiku-reasoning run whose verify rounds grow past 100k is under-estimated.
const HAIKU_5_5_PRICING: ModelPricing = {
  inputPerMtok: 0.1,
  outputPerMtok: 0.5,
  cacheWritePerMtok: 0.125,
  cacheReadPerMtok: 0.01,
};

const SONNET_5_5_PRICING: ModelPricing = {
  inputPerMtok: 2.0,
  outputPerMtok: 10.0,
  cacheWritePerMtok: 2.5,
  cacheReadPerMtok: 0.2,
};

// Costs are computed at read time from the model id stored on each usage row,
// so the models the pipeline no longer calls keep their own rates.
const HAIKU_4_5_PRICING: ModelPricing = {
  inputPerMtok: 1.0,
  outputPerMtok: 5.0,
  cacheWritePerMtok: 1.25,
  cacheReadPerMtok: 0.1,
};

const PRICING_USD: Record<string, ModelPricing> = {
  [HAIKU_MODEL]: HAIKU_5_5_PRICING,
  [SONNET_MODEL]: SONNET_5_5_PRICING,
  [LEGACY_HAIKU_4_5_MODEL]: HAIKU_4_5_PRICING,
  // Sonnet 5.5 kept Sonnet 5's list price.
  [LEGACY_SONNET_5_MODEL]: SONNET_5_5_PRICING,
};

// An unknown model still gets a defensible estimate rather than a zero cost.
const FALLBACK_PRICING = HAIKU_5_5_PRICING;

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
