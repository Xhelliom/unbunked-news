import type { Verdict } from "@/lib/verdicts";

// Rolling, best-effort snapshot of a run's in-flight numbers, persisted on
// `jobs.live` and polled by the admin progress UI so the operator watches claims,
// sources and the emerging verdict accumulate live instead of a bare progress
// bar. Every field is optional: it appears once its phase has produced it.
export type JobLive = {
  contentChars?: number;
  claimsExtracted?: number;
  verifyRound?: number;
  verifyRoundsMax?: number;
  sourcesFound?: number;
  verdict?: Verdict | null;
  reliabilityScore?: number | null;
  claimsAssessed?: number;
  rewriteLocalesDone?: number;
};

// Why a run paused before the reasoning phases, plus the defaults and the
// suggested overrides surfaced to the admin (see the preflight gate in run.ts).
export type PauseInfo = {
  reason: "long-article";
  contentChars: number;
  truncateAt: number;
  defaultMaxClaims: number;
  defaultMaxSearchRounds: number;
  suggestedMaxClaims: number;
  suggestedMaxSearchRounds: number;
};
