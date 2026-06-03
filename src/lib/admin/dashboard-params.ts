import type { ClaimStatus } from "@/lib/claim-status";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

// Query-param names for the editorial dashboard, shared between the server page
// that reads them and the client filter bar that writes them.
export const DASHBOARD_PARAM = {
  view: "view",
  sort: "sort",
  verdict: "verdict",
  status: "status",
  flag: "flag",
} as const;

export const TRASH_VIEW = "trash";

// Sort keys exposed in the toolbar. "recent"/"oldest" sort by publish date
// (falling back to creation), "views" by all-time pageviews, "score" by the
// derived reliability score.
export const DASHBOARD_SORTS = ["recent", "oldest", "views", "score"] as const;
export type DashboardSort = (typeof DASHBOARD_SORTS)[number];
export const DEFAULT_DASHBOARD_SORT: DashboardSort = "recent";

export function parseSort(raw: string | undefined): DashboardSort {
  return (DASHBOARD_SORTS as readonly string[]).includes(raw ?? "")
    ? (raw as DashboardSort)
    : DEFAULT_DASHBOARD_SORT;
}

export const STATUS_FILTERS = ["published", "draft"] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export function parseStatusFilter(
  raw: string | undefined,
): StatusFilter | null {
  return (STATUS_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as StatusFilter)
    : null;
}

export function parseVerdictFilter(raw: string | undefined): Verdict | null {
  return (VERDICTS as readonly string[]).includes(raw ?? "")
    ? (raw as Verdict)
    : null;
}

// The single "needs a second look" flag the toolbar can filter on.
export const FLAG_REVIEW = "review";

export function parseFlagFilter(raw: string | undefined): boolean {
  return raw === FLAG_REVIEW;
}

// Per-article claim tally, one entry per status plus the grand total.
export type ClaimCounts = Record<ClaimStatus, number> & { total: number };

// Row shape rendered by the dashboard table: article core fields plus the
// aggregated engagement and claim data the editorial view adds.
export type DashboardArticle = {
  id: string;
  slug: string;
  title: string;
  sourceName: string;
  locale: string;
  verdict: Verdict | null;
  reliabilityScore: number | null;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
  hasImage: boolean;
  killswitch: boolean;
  views: number;
  recentViews: number;
  reads: number;
  claims: ClaimCounts;
};

// Reasons the editorial view surfaces an article as needing attention. Order is
// the priority order the table uses when it shows the single most urgent reason.
export const ATTENTION_REASONS = [
  "killswitch",
  "lowScoreHighViews",
  "manyUnverified",
  "noImage",
] as const;
export type AttentionReason = (typeof ATTENTION_REASONS)[number];

// A published article scoring below this while pulling real traffic is fragile
// content that is highly exposed — worth a re-check.
export const LOW_SCORE_THRESHOLD = 50;
export const HIGH_RECENT_VIEWS_THRESHOLD = 100;
// Half or more of the claims left unverifiable is a thin fact-check.
export const UNVERIFIED_SHARE_THRESHOLD = 0.5;

export function attentionReasons(article: DashboardArticle): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  if (article.killswitch) {
    reasons.push("killswitch");
  }
  if (
    article.published &&
    article.reliabilityScore !== null &&
    article.reliabilityScore < LOW_SCORE_THRESHOLD &&
    article.recentViews >= HIGH_RECENT_VIEWS_THRESHOLD
  ) {
    reasons.push("lowScoreHighViews");
  }
  const { total, unverifiable } = article.claims;
  if (total > 0 && unverifiable / total >= UNVERIFIED_SHARE_THRESHOLD) {
    reasons.push("manyUnverified");
  }
  if (article.published && !article.hasImage) {
    reasons.push("noImage");
  }
  return reasons;
}
