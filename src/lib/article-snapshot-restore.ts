import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import {
  articleKeywords,
  articleRewrites,
  articleSnapshots,
  articles,
  claimSources,
  claims as claimsTable,
} from "@/db/schema";
import { buildArticleSnapshot } from "@/lib/article-snapshot";
import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/claim-status";
import { isRubric, type Rubric } from "@/lib/rubrics";
import {
  CONFIDENCE_LEVELS,
  CONTENT_TYPE_VALUES,
  FRAMING_VALUES,
  type Confidence,
  type ContentType,
  type Framing,
} from "@/lib/score-criteria";
import { VERDICTS, type Verdict } from "@/lib/verdicts";

// A claim's status is NOT NULL, so an unrecognised value (a removed enum member
// in a very old snapshot) falls back to the most cautious one rather than
// breaking the restore.
const FALLBACK_CLAIM_STATUS: ClaimStatus = "unverifiable";

// Snapshots store enum columns as plain strings (see ArticleSnapshotData), so a
// restore narrows them back to the live enum, dropping any value the schema no
// longer accepts.
function toVerdict(value: string | null): Verdict | null {
  return value !== null && (VERDICTS as readonly string[]).includes(value)
    ? (value as Verdict)
    : null;
}

function toFraming(value: string | null): Framing | null {
  return value !== null && (FRAMING_VALUES as readonly string[]).includes(value)
    ? (value as Framing)
    : null;
}

function toContentType(value: string | null): ContentType | null {
  return value !== null &&
    (CONTENT_TYPE_VALUES as readonly string[]).includes(value)
    ? (value as ContentType)
    : null;
}

function toConfidence(value: string | null): Confidence | null {
  return value !== null &&
    (CONFIDENCE_LEVELS as readonly string[]).includes(value)
    ? (value as Confidence)
    : null;
}

function toRubric(value: string | null): Rubric | null {
  return isRubric(value) ? value : null;
}

function toClaimStatus(value: string): ClaimStatus {
  return (CLAIM_STATUSES as readonly string[]).includes(value)
    ? (value as ClaimStatus)
    : FALLBACK_CLAIM_STATUS;
}

// Overwrites an article with a previously captured version, archiving the
// current state first so a restore is itself reversible. The scraped body, URL,
// slug and publication state are untouched — only the analysis (verdict, scores,
// evidence, claims and rewrites) is rolled back. Returns the article id, or null
// when the snapshot or its article no longer exists.
export async function restoreArticleSnapshot(
  snapshotId: string,
): Promise<string | null> {
  return db.transaction(async (tx) => {
    const snapshot = await tx.query.articleSnapshots.findFirst({
      where: eq(articleSnapshots.id, snapshotId),
    });
    if (!snapshot) return null;

    const { articleId } = snapshot;
    const current = await tx.query.articles.findFirst({
      where: eq(articles.id, articleId),
      with: {
        claims: { with: { sources: true } },
        rewrites: true,
        keywords: true,
      },
    });
    if (!current) return null;

    await tx.insert(articleSnapshots).values({
      articleId,
      data: buildArticleSnapshot(current),
    });

    const { data } = snapshot;
    await tx
      .update(articles)
      .set({
        title: data.title,
        summary: data.summary,
        originalSummary: data.originalSummary,
        verdict: toVerdict(data.verdict),
        reliabilityScore: data.reliabilityScore,
        factualityScore: data.factualityScore,
        corroborationScore: data.corroborationScore,
        sourcingScore: data.sourcingScore,
        completenessScore: data.completenessScore,
        transparencyScore: data.transparencyScore,
        recencyScore: data.recencyScore,
        framing: toFraming(data.framing),
        contentType: toContentType(data.contentType),
        globalConfidence: toConfidence(data.globalConfidence),
        criteriaVersion: data.criteriaVersion,
        modelVersion: data.modelVersion,
        evidence: data.evidence,
        rubric: toRubric(data.rubric),
        locale: data.locale,
      })
      .where(eq(articles.id, articleId));

    await tx.delete(claimsTable).where(eq(claimsTable.articleId, articleId));
    await tx
      .delete(articleRewrites)
      .where(eq(articleRewrites.articleId, articleId));
    await tx
      .delete(articleKeywords)
      .where(eq(articleKeywords.articleId, articleId));

    const keywords = [...new Set(data.keywords)].filter(Boolean);
    if (keywords.length > 0) {
      await tx
        .insert(articleKeywords)
        .values(keywords.map((keyword) => ({ articleId, keyword })))
        .onConflictDoNothing();
    }

    if (data.rewrites.length > 0) {
      await tx.insert(articleRewrites).values(
        data.rewrites.map((rewrite) => ({
          articleId,
          locale: rewrite.locale,
          title: rewrite.title,
          body: rewrite.body,
        })),
      );
    }

    for (const claim of data.claims) {
      const [createdClaim] = await tx
        .insert(claimsTable)
        .values({
          articleId,
          position: claim.position,
          claimText: claim.claimText,
          status: toClaimStatus(claim.status),
          explanation: claim.explanation,
          sourceQuote: claim.sourceQuote,
        })
        .returning({ id: claimsTable.id });

      if (claim.sources.length > 0) {
        await tx.insert(claimSources).values(
          claim.sources.map((source) => ({
            claimId: createdClaim.id,
            url: source.url,
            title: source.title,
            publisher: source.publisher,
          })),
        );
      }
    }

    return articleId;
  });
}
