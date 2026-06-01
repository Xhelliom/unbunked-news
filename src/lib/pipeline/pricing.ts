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
