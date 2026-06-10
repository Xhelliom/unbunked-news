// Tunable ceilings for the pipeline parameters an admin can raise when a long
// article is paused for review. Kept free of `server-only` and of heavy imports
// (like models.ts) so the admin resume form (client) and the server phases can
// share one source of truth for the defaults and bounds.

export const DEFAULT_MAX_CLAIMS = 12;
export const MAX_CLAIMS_CEILING = 20;
export const DEFAULT_MAX_SEARCH_ROUNDS = 5;
export const MAX_SEARCH_ROUNDS_CEILING = 10;

// Values pre-filled in the pause dialog for an over-window article: more claims
// to cover the extra material, more search rounds to verify them. The admin can
// still dial them anywhere within [1, ceiling].
export const LONG_ARTICLE_SUGGESTED_CLAIMS = 16;
export const LONG_ARTICLE_SUGGESTED_SEARCH_ROUNDS = 8;

export function clampMaxClaims(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_CLAIMS;
  return Math.min(MAX_CLAIMS_CEILING, Math.max(1, Math.round(value)));
}

export function clampMaxSearchRounds(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_SEARCH_ROUNDS;
  return Math.min(MAX_SEARCH_ROUNDS_CEILING, Math.max(1, Math.round(value)));
}
