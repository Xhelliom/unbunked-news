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
// partly_true→nuanced (amber), misleading→biased (orange), false→debunked
// (red), unverifiable→neutral gray.
export const claimStatusBadgeClasses: Record<ClaimStatus, string> = {
  supported:
    "bg-verdict-reliable-bg text-verdict-reliable-fg ring-verdict-reliable/30",
  partly_true:
    "bg-verdict-nuanced-bg text-verdict-nuanced-fg ring-verdict-nuanced/30",
  misleading:
    "bg-verdict-biased-bg text-verdict-biased-fg ring-verdict-biased/30",
  false:
    "bg-verdict-debunked-bg text-verdict-debunked-fg ring-verdict-debunked/30",
  unverifiable:
    "bg-verdict-unverifiable-bg text-verdict-unverifiable-fg ring-verdict-unverifiable/40",
};

export const claimStatusDotClasses: Record<ClaimStatus, string> = {
  supported: "bg-verdict-reliable",
  partly_true: "bg-verdict-nuanced",
  misleading: "bg-verdict-biased",
  false: "bg-verdict-debunked",
  unverifiable: "bg-verdict-unverifiable",
};

// Solid border tint used to highlight an annotated paragraph by status.
export const claimStatusBorderClasses: Record<ClaimStatus, string> = {
  supported: "border-verdict-reliable",
  partly_true: "border-verdict-nuanced",
  misleading: "border-verdict-biased",
  false: "border-verdict-debunked",
  unverifiable: "border-verdict-unverifiable",
};
