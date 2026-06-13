// Tunable ceilings for the pipeline parameters an admin can raise when a long
// article is paused for review. Kept free of `server-only` and of heavy imports
// (like models.ts) so the admin resume form (client) and the server phases can
// share one source of truth for the defaults and bounds.

export const DEFAULT_MAX_CLAIMS = 12;
export const MAX_CLAIMS_CEILING = 30;
export const DEFAULT_MAX_SEARCH_ROUNDS = 5;
export const MAX_SEARCH_ROUNDS_CEILING = 10;

// A long article carries more checkable material than a short one, so the claim
// budget scales with its body length instead of sitting at a flat default that
// would under-cover an investigation. Roughly one claim per this many characters.
const CHARS_PER_CLAIM = 2_500;

// Search rounds pre-filled in the pause dialog for an over-window article: more
// rounds to verify the larger claim set. The admin can still dial it anywhere
// within [1, ceiling].
export const LONG_ARTICLE_SUGGESTED_SEARCH_ROUNDS = 8;

export function clampMaxClaims(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_CLAIMS;
  return Math.min(MAX_CLAIMS_CEILING, Math.max(1, Math.round(value)));
}

// Claim budget for an article of the given body length: scaled up for long
// pieces, floored at the flat default so short articles keep their current
// budget, and clamped to the ceiling. Used both as the default for an un-paused
// run and as the pre-filled suggestion when a long article pauses for review.
export function suggestedMaxClaims(contentChars: number): number {
  const scaled = Math.ceil(contentChars / CHARS_PER_CLAIM);
  return clampMaxClaims(Math.max(DEFAULT_MAX_CLAIMS, scaled));
}

export function clampMaxSearchRounds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_SEARCH_ROUNDS;
  return Math.min(MAX_SEARCH_ROUNDS_CEILING, Math.max(1, Math.round(value)));
}
