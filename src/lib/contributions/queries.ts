import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { contributions } from "@/db/contributions-schema";
import type {
  AiModerationVerdict,
  ContributionStatus,
} from "@/lib/contributions/constants";

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
