import "server-only";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db/client";
import {
  articleRewrites,
  articleTags,
  articleTokenUsage,
  articles,
  claimSources,
  claims as claimsTable,
  jobs,
  tags as tagsTable,
  type NewJob,
} from "@/db/schema";
import { routing } from "@/i18n/routing";
import { scrapeArticle } from "@/lib/scrape";
import { aggregate } from "./aggregate";
import { addUsage, MODEL, ZERO_USAGE } from "./client";
import { extractClaims } from "./extract-claims";
import { rewriteArticle } from "./rewrite";
import { verifyClaims } from "./verify";

// Upper bound on the stored article body to keep rows reasonable.
const MAX_STORED_CONTENT_CHARS = 60_000;

const TAG_PALETTE = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function colorForTag(slug: string): string {
  let hash = 0;
  for (const ch of slug) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

async function updateJob(id: string, fields: Partial<NewJob>): Promise<void> {
  await db.update(jobs).set(fields).where(eq(jobs.id, id));
}

export async function runPipeline(jobId: string): Promise<void> {
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) });
  if (!job) return;

  try {
    await updateJob(jobId, {
      status: "running",
      step: "scraping",
      progress: 5,
      startedAt: new Date(),
      error: null,
    });

    const article = await scrapeArticle(job.url);

    await updateJob(jobId, { step: "extracting", progress: 25 });
    const { claims, usage: extractUsage } = await extractClaims(article);

    await updateJob(jobId, { step: "verifying", progress: 45 });
    const verification = await verifyClaims(article, claims);

    await updateJob(jobId, { step: "aggregating", progress: 60 });
    const { analysis, usage: aggregateUsage } = await aggregate(
      article,
      claims,
      verification,
    );

    await updateJob(jobId, { step: "rewriting", progress: 75 });
    const rewriteResults = await Promise.all(
      routing.locales.map((locale) => rewriteArticle(article, analysis, locale)),
    );
    const rewrites = rewriteResults.map((result) => result.rewrite);

    const totalUsage = [
      extractUsage,
      verification.usage,
      aggregateUsage,
      ...rewriteResults.map((result) => result.usage),
    ].reduce(addUsage, ZERO_USAGE);

    await updateJob(jobId, { step: "saving", progress: 92 });

    const articleId = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(articles)
        .values({
          slug: `${slugify(analysis.title)}-${crypto.randomUUID().slice(0, 6)}`,
          urlOrigine: article.url,
          sourceName: article.sourceName,
          originalTitle: article.title,
          title: analysis.title,
          summary: analysis.summary,
          originalSummary: analysis.originalSummary,
          content: article.content.slice(0, MAX_STORED_CONTENT_CHARS),
          imageUrl: article.imageUrl,
          verdict: analysis.verdict,
          reliabilityScore: analysis.reliabilityScore,
          factualityScore: analysis.factualityScore,
          sourcingScore: analysis.sourcingScore,
          neutralityScore: analysis.neutralityScore,
          completenessScore: analysis.completenessScore,
          transparencyScore: analysis.transparencyScore,
          recencyScore: analysis.recencyScore,
          locale: analysis.language,
          published: false,
        })
        .returning({ id: articles.id });

      await tx.insert(articleTokenUsage).values({
        articleId: created.id,
        model: MODEL,
        inputTokens: totalUsage.inputTokens,
        outputTokens: totalUsage.outputTokens,
        cacheCreationTokens: totalUsage.cacheCreationTokens,
        cacheReadTokens: totalUsage.cacheReadTokens,
      });

      if (rewrites.length > 0) {
        await tx.insert(articleRewrites).values(
          rewrites.map((r) => ({
            articleId: created.id,
            locale: r.locale,
            title: r.title,
            body: r.body,
          })),
        );
      }

      for (const [index, claim] of analysis.claims.entries()) {
        const [createdClaim] = await tx
          .insert(claimsTable)
          .values({
            articleId: created.id,
            position: index,
            claimText: claim.text,
            status: claim.status,
            explanation: claim.explanation,
            sourceQuote: claim.sourceQuote || null,
          })
          .returning({ id: claimsTable.id });

        if (claim.sources.length > 0) {
          await tx.insert(claimSources).values(
            claim.sources.map((source) => ({
              claimId: createdClaim.id,
              url: source.url,
              title: source.title,
            })),
          );
        }
      }

      if (analysis.tags.length > 0) {
        const tagRows = analysis.tags.map((label) => {
          const slug = slugify(label);
          return { label, slug, color: colorForTag(slug) };
        });
        await tx
          .insert(tagsTable)
          .values(tagRows)
          .onConflictDoNothing({ target: tagsTable.slug });

        const stored = await tx
          .select({ id: tagsTable.id })
          .from(tagsTable)
          .where(
            inArray(
              tagsTable.slug,
              tagRows.map((t) => t.slug),
            ),
          );
        if (stored.length > 0) {
          await tx
            .insert(articleTags)
            .values(stored.map((t) => ({ articleId: created.id, tagId: t.id })))
            .onConflictDoNothing();
        }
      }

      return created.id;
    });

    await updateJob(jobId, {
      status: "succeeded",
      step: "done",
      progress: 100,
      articleId,
      finishedAt: new Date(),
    });
  } catch (error) {
    await updateJob(jobId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      finishedAt: new Date(),
    });
  }
}
