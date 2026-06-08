// Source of truth for contribution enums and limits. No `server-only`: the
// status/verdict unions and labels are needed on the client too (admin UI,
// public display), while the DB enums and runtime checks derive from here.

// Moderation lifecycle of a contribution.
export const CONTRIBUTION_STATUSES = [
  "pending", // awaiting admin moderation
  "approved", // published on the public article page
  "rejected", // refused (by an admin, or auto-rejected as spam)
] as const;
export type ContributionStatus = (typeof CONTRIBUTION_STATUSES)[number];

// Verdict of the optional AI pre-moderation pass, kept separate from the
// moderation status: the AI pre-classifies, the admin still decides.
export const AI_MODERATION_VERDICTS = [
  "clean",
  "suspicious",
  "spam",
] as const;
export type AiModerationVerdict = (typeof AI_MODERATION_VERDICTS)[number];

export const CONTRIBUTION_BODY_MAX_CHARS = 2000;

// Simple per-user rate limit, enforced in Postgres (no Redis dependency).
export const CONTRIBUTION_RATE_WINDOW_MS = 60 * 60 * 1000;
export const CONTRIBUTION_RATE_MAX_PER_WINDOW = 5;
