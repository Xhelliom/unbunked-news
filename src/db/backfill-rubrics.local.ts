import { eq, isNull } from "drizzle-orm";

import { db } from "./client";
import { articles } from "./schema";
import { FALLBACK_RUBRIC } from "@/lib/rubrics";
import { rubricForTagSlugs } from "@/lib/tag-rubric-map";

// Deterministic, no-AI backfill of `articles.rubric` from the retired open-tag
// vocabulary (heuristic in src/lib/tag-rubric-map.ts).
//
//   pnpm db:backfill-rubrics-local
//
// In every environment the backfill runs automatically via data migration 0020
// (db-migrate Job). This script is the equivalent local/ad-hoc helper: it logs
// each assignment and the `societe` fallbacks for editor review, which the SQL
// migration can't. Idempotent: only touches rows whose rubric is still null;
// articles with no mappable tag get the `societe` catch-all.

async function backfill(): Promise<void> {
  const rows = await db.query.articles.findMany({
    where: isNull(articles.rubric),
    with: { articleTags: { with: { tag: true } } },
  });

  if (rows.length === 0) {
    console.log("No articles without a rubric — nothing to do.");
    return;
  }
  console.log(`Backfilling rubric for ${rows.length} article(s)…`);

  let fallbackCount = 0;
  for (const article of rows) {
    const slugs = article.articleTags.map(({ tag }) => tag.slug);
    const rubric = rubricForTagSlugs(slugs);
    if (rubric === FALLBACK_RUBRIC && !slugs.includes(FALLBACK_RUBRIC)) {
      fallbackCount += 1;
      console.warn(
        `  ⚠ no mappable tag for "${article.title}" (tags: ${
          slugs.join(", ") || "none"
        }) → ${FALLBACK_RUBRIC} (review)`,
      );
    }

    await db
      .update(articles)
      .set({ rubric })
      .where(eq(articles.id, article.id));

    console.log(`• ${article.title} → ${rubric}`);
  }

  console.log(
    `\nDone. ${rows.length} updated, ${fallbackCount} fell back to ${FALLBACK_RUBRIC} (review).`,
  );
}

backfill()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
