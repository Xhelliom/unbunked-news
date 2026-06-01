import type { Verdict } from "@/lib/verdicts";

// Claim status values are kept in sync with the claim_status enum in
// src/db/schema.ts. This module is the UI source of truth for their styling.
export const CLAIM_STATUSES = [
  "supported",
  "partly_true",
  "misleading",
  "false",
  "unverifiable",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

// Each status reuses a verdict color family: supported→reliable (green),
// partly_true→nuanced (amber), misleading→fragile (orange), false→debunked
// (red), unverifiable→neutral gray.
export const claimStatusToVerdict: Record<ClaimStatus, Verdict> = {
  supported: "reliable",
  partly_true: "nuanced",
  misleading: "fragile",
  false: "debunked",
  unverifiable: "unverifiable",
};

export const claimStatusBadgeClasses: Record<ClaimStatus, string> = {
  supported:
    "bg-verdict-reliable-bg text-verdict-reliable-fg ring-verdict-reliable/30",
  partly_true:
    "bg-verdict-nuanced-bg text-verdict-nuanced-fg ring-verdict-nuanced/30",
  misleading:
    "bg-verdict-fragile-bg text-verdict-fragile-fg ring-verdict-fragile/30",
  false:
    "bg-verdict-debunked-bg text-verdict-debunked-fg ring-verdict-debunked/30",
  unverifiable:
    "bg-verdict-unverifiable-bg text-verdict-unverifiable-fg ring-verdict-unverifiable/40",
};

export const claimStatusDotClasses: Record<ClaimStatus, string> = {
  supported: "bg-verdict-reliable",
  partly_true: "bg-verdict-nuanced",
  misleading: "bg-verdict-fragile",
  false: "bg-verdict-debunked",
  unverifiable: "bg-verdict-unverifiable",
};

// Inline highlight tint for a quoted passage in the reading view (background +
// a ring colour that only shows when the highlight is the active/focused one).
export const claimStatusHighlightClasses: Record<ClaimStatus, string> = {
  supported: "bg-verdict-reliable-bg ring-verdict-reliable/50",
  partly_true: "bg-verdict-nuanced-bg ring-verdict-nuanced/50",
  misleading: "bg-verdict-fragile-bg ring-verdict-fragile/50",
  false: "bg-verdict-debunked-bg ring-verdict-debunked/50",
  unverifiable: "bg-verdict-unverifiable-bg ring-verdict-unverifiable/50",
};

// Solid border tint used to highlight an annotated paragraph by status.
export const claimStatusBorderClasses: Record<ClaimStatus, string> = {
  supported: "border-verdict-reliable",
  partly_true: "border-verdict-nuanced",
  misleading: "border-verdict-fragile",
  false: "border-verdict-debunked",
  unverifiable: "border-verdict-unverifiable",
};
