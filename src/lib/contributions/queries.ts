import "server-only";

import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { contributions } from "@/db/contributions-schema";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import type {
  AiModerationVerdict,
  ContributionStatus,
} from "@/lib/contributions/constants";

// Approved contribution as shown publicly: the author is the pseudonym
// (user.name), never the email.
export type PublicContribution = {
  id: string;
  claimId: string | null;
  body: string;
  sourceUrl: string | null;
  authorName: string;
};

export type ModerationItem = {
  id: string;
  body: string;
  sourceUrl: string | null;
  aiVerdict: AiModerationVerdict | null;
  aiReason: string | null;
  createdAt: Date;
  articleTitle: string;
  articleSlug: string;
  claimText: string | null;
  claimPosition: number | null;
  authorName: string;
};

// Moderation queue read for the admin. Intentionally uncached: the queue must be
// fresh after every approve/reject.
export async function loadModerationQueue(
  status: ContributionStatus,
): Promise<ModerationItem[]> {
  const rows = await db.query.contributions.findMany({
    where: eq(contributions.status, status),
    orderBy: (contribution, { desc }) => [desc(contribution.createdAt)],
    with: {
      article: { columns: { title: true, slug: true } },
      claim: { columns: { claimText: true, position: true } },
      author: { columns: { name: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    body: row.body,
    sourceUrl: row.sourceUrl,
    aiVerdict: row.aiVerdict,
    aiReason: row.aiReason,
    createdAt: row.createdAt,
    articleTitle: row.article.title,
    articleSlug: row.article.slug,
    claimText: row.claim?.claimText ?? null,
    claimPosition: row.claim?.position ?? null,
    authorName: row.author.name,
  }));
}

async function loadApprovedContributions(
  articleId: string,
): Promise<PublicContribution[]> {
  const rows = await db.query.contributions.findMany({
    where: and(
      eq(contributions.articleId, articleId),
      eq(contributions.status, "approved"),
    ),
    orderBy: (contribution, { asc }) => [asc(contribution.createdAt)],
    with: { author: { columns: { name: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    claimId: row.claimId,
    body: row.body,
    sourceUrl: row.sourceUrl,
    authorName: row.author.name,
  }));
}

// Public read: cached under the shared articles tag, so approving a
// contribution (which revalidates that tag) makes it appear without delay.
const loadApprovedContributionsCached = unstable_cache(
  loadApprovedContributions,
  ["approved-contributions"],
  { tags: [ARTICLES_CACHE_TAG] },
);

export async function getApprovedContributions(
  articleId: string,
): Promise<PublicContribution[]> {
  return loadApprovedContributionsCached(articleId);
}
