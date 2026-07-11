// Single source of truth for the Claude model identifiers used by the pipeline.
// Kept free of `server-only` and of any heavy imports so both server modules
// (phases, run, pricing) and the client model picker can import it. Pricing for
// every id listed here lives in pricing.ts (PRICING_USD).

// Mechanical phases (claim extraction, paywall body recovery) run on the cheap,
// fast model. Reasoning phases (verification, scoring, rewrite) run on a stronger
// model — see run.ts for the tiering.
export const HAIKU_MODEL = "claude-haiku-4-5-20251001";
export const SONNET_MODEL = "claude-sonnet-5";

// The reasoning-tier model an admin may pick when submitting a URL — the single
// source of truth reused by the submit form, the server action that validates
// the choice, and run.ts. The default keeps judgement on Sonnet (the standard
// tiering); picking Haiku runs the whole job on the cheaper model.
export const SELECTABLE_REASONING_MODELS = [SONNET_MODEL, HAIKU_MODEL] as const;
export type ReasoningModel = (typeof SELECTABLE_REASONING_MODELS)[number];
export const DEFAULT_REASONING_MODEL: ReasoningModel = SONNET_MODEL;

// Stable short key per selectable model, used to look up its i18n label without
// putting model ids (which contain dots and dashes) into translation keys. The
// literal values keep next-intl's key typing happy (`models.sonnet`/`.haiku`).
export const REASONING_MODEL_LABEL_KEY = {
  [SONNET_MODEL]: "sonnet",
  [HAIKU_MODEL]: "haiku",
} as const satisfies Record<ReasoningModel, string>;

export function isReasoningModel(value: unknown): value is ReasoningModel {
  return (
    typeof value === "string" &&
    (SELECTABLE_REASONING_MODELS as readonly string[]).includes(value)
  );
}
