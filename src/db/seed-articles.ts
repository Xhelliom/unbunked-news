import "dotenv/config";

import { inArray } from "drizzle-orm";

import { db } from "./client";
import {
  articleRewrites,
  articleTags,
  articles,
  claimSources,
  claims,
  tags,
} from "./schema";
import { ARTICLES, TAGS } from "./seed-articles-data";
import { REWRITES } from "./seed-articles-rewrites";
import { rubricForTagSlugs } from "@/lib/tag-rubric-map";

// Inserts the demo articles, their claims, sources, tags and Unbunked
// rewrites. Re-runnable: it wipes and re-inserts the seeded slugs only.
//
//   pnpm db:seed-articles

async function main() {
  const slugs = ARTICLES.map((a) => a.slug);

  // Idempotent: remove our demo rows first. Cascades drop claims, sources,
  // rewrites and article/tag links automatically.
  await db.delete(articles).where(inArray(articles.slug, slugs));

  // Upsert tags by slug and index their ids.
  await db.insert(tags).values(TAGS).onConflictDoNothing({ target: tags.slug });
  const tagRows = await db.select().from(tags);
  const tagIdBySlug = new Map(tagRows.map((row) => [row.slug, row.id]));

  for (const article of ARTICLES) {
    const tagId = tagIdBySlug.get(article.tagSlug);
    if (!tagId) {
      throw new Error(`Missing tag for slug "${article.tagSlug}"`);
    }

    const content = article.body.map((p) => p.text).join("\n\n");

    const [row] = await db
      .insert(articles)
      .values({
        slug: article.slug,
        urlOrigine: article.sourceUrl,
        sourceName: article.sourceName,
        originalTitle: article.originalTitle,
        title: article.title,
        summary: article.summary,
        originalSummary: article.originalSummary,
        showOriginal: article.showOriginal ?? true,
        content,
        imageUrl: null,
        verdict: article.verdict,
        reliabilityScore: article.reliabilityScore,
        factualityScore: article.factualityScore ?? article.reliabilityScore,
        sourcingScore: article.sourcingScore ?? article.reliabilityScore,
        neutralityScore: article.neutralityScore ?? article.reliabilityScore,
        completenessScore: article.completenessScore ?? null,
        transparencyScore: article.transparencyScore ?? null,
        recencyScore: article.recencyScore ?? null,
        rubric: rubricForTagSlugs([article.tagSlug]),
        locale: "fr",
        published: true,
        publishedAt: new Date(article.publishedAt),
      })
      .returning({ id: articles.id });

    await db.insert(articleTags).values({ articleId: row.id, tagId });

    const rewrites = REWRITES[article.slug];
    if (rewrites) {
      await db.insert(articleRewrites).values([
        {
          articleId: row.id,
          locale: "fr",
          title: rewrites.fr.title,
          body: rewrites.fr.body,
        },
        {
          articleId: row.id,
          locale: "en",
          title: rewrites.en.title,
          body: rewrites.en.body,
        },
      ]);
    }

    let position = 0;
    for (const paragraph of article.body) {
      const paraClaims = [
        ...(paragraph.claim ? [paragraph.claim] : []),
        ...(paragraph.claims ?? []),
      ];

      for (const claim of paraClaims) {
        const [claimRow] = await db
          .insert(claims)
          .values({
            articleId: row.id,
            position: position++,
            claimText: claim.claimText,
            status: claim.status,
            explanation: claim.explanation,
            sourceQuote: claim.anchor,
          })
          .returning({ id: claims.id });

        if (claim.sources.length > 0) {
          await db.insert(claimSources).values(
            claim.sources.map((source) => ({
              claimId: claimRow.id,
              url: source.url,
              title: source.title,
            })),
          );
        }
      }
    }

    console.log(`Seeded: ${article.slug}`);
  }

  console.log(`\nDone — ${ARTICLES.length} articles published.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Failed to seed articles:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
