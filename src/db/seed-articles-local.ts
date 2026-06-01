import "dotenv/config";

import { inArray } from "drizzle-orm";

import { db } from "./client";
import {
  articleTags,
  articles,
  claimSources,
  claims,
  tags,
} from "./schema";
import { LOCAL_ARTICLES, LOCAL_TAGS } from "./seed-articles-data.local";

// Seeds your personal local articles (gitignored).
// Populate seed-articles-data.local.ts, then run:
//   pnpm db:seed-local

async function main() {
  if (LOCAL_ARTICLES.length === 0) {
    console.log("No articles in seed-articles-data.local.ts — nothing to do.");
    return;
  }

  const slugs = LOCAL_ARTICLES.map((a) => a.slug);
  await db.delete(articles).where(inArray(articles.slug, slugs));

  if (LOCAL_TAGS.length > 0) {
    await db.insert(tags).values(LOCAL_TAGS).onConflictDoNothing({ target: tags.slug });
  }
  const tagRows = await db.select().from(tags);
  const tagIdBySlug = new Map(tagRows.map((row) => [row.slug, row.id]));

  for (const article of LOCAL_ARTICLES) {
    const tagId = tagIdBySlug.get(article.tagSlug);
    if (!tagId) throw new Error(`Missing tag for slug "${article.tagSlug}"`);

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
        locale: "fr",
        published: true,
        publishedAt: new Date(article.publishedAt),
      })
      .returning({ id: articles.id });

    await db.insert(articleTags).values({ articleId: row.id, tagId });

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

  console.log(`\nDone — ${LOCAL_ARTICLES.length} local articles published.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to seed local articles:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
