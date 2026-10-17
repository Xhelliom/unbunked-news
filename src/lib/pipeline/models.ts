// Single source of truth for the Claude model identifiers used by the pipeline.
// Kept free of `server-only` and of any heavy imports so both server modules
// (phases, run, pricing) and the client model picker can import it. Pricing for
// every id listed here lives in pricing.ts (PRICING_USD).

// Mechanical phases (claim extraction, paywall body recovery) run on the cheap,
// fast model. Reasoning phases (verification, scoring, rewrite) run on a stronger
// model — see run.ts for the tiering.
export const HAIKU_MODEL = "claude-haiku-5-5";
export const SONNET_MODEL = "claude-sonnet-5-5";

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

// Dynamic-filtering web search (web_search_20260209) runs through programmatic
// tool calling, which Haiku is not documented to support. Typed per selectable
// model so adding one forces a decision here.
export const SUPPORTS_DYNAMIC_FILTERING = {
  [SONNET_MODEL]: true,
  [HAIKU_MODEL]: false,
} as const satisfies Record<ReasoningModel, boolean>;

// Ids the pipeline used before the 5.5 generation. Jobs queued or paused at the
// preflight gate keep the model their submitter picked, so they run on its
// successor rather than falling back to the default tier; pricing.ts keys the
// rates of past runs on them.
export const LEGACY_HAIKU_4_5_MODEL = "claude-haiku-4-5-20251001";
export const LEGACY_SONNET_5_MODEL = "claude-sonnet-5";
const LEGACY_REASONING_MODEL_SUCCESSOR: Record<string, ReasoningModel> = {
  [LEGACY_HAIKU_4_5_MODEL]: HAIKU_MODEL,
  [LEGACY_SONNET_5_MODEL]: SONNET_MODEL,
};

export function isReasoningModel(value: unknown): value is ReasoningModel {
  return (
    typeof value === "string" &&
    (SELECTABLE_REASONING_MODELS as readonly string[]).includes(value)
  );
}

export function toReasoningModel(value: unknown): ReasoningModel {
  if (isReasoningModel(value)) return value;
  if (typeof value === "string" && value in LEGACY_REASONING_MODEL_SUCCESSOR) {
    return LEGACY_REASONING_MODEL_SUCCESSOR[value];
  }
  return DEFAULT_REASONING_MODEL;
}
