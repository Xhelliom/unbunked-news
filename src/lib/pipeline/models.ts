// Single source of truth for the Claude model identifiers used by the pipeline.
// Kept free of `server-only` and of any heavy imports so both server modules
// (phases, run, pricing) and the client model picker can import it. Pricing for
// every id listed here lives in pricing.ts (PRICING_USD).

// Mechanical phases (claim extraction, paywall body recovery) run on the cheap,
// fast model. Reasoning phases (verification, scoring, rewrite) run on a stronger
// model — see run.ts for the tiering.
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-4-6";
