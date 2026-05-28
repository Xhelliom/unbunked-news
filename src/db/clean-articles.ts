import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "./client";
import { articles } from "./schema";
import { cleanArticleContent } from "../lib/boilerplate";

// Re-applies the boilerplate filter to every stored article body, so content
// scraped before the filter existed gets cleaned up too.
//
//   pnpm db:clean-articles
async function main() {
  const rows = await db
    .select({ id: articles.id, slug: articles.slug, content: articles.content })
    .from(articles);

  let cleaned = 0;
  for (const row of rows) {
    if (!row.content) continue;
    const next = cleanArticleContent(row.content);
    if (next !== row.content) {
      await db
        .update(articles)
        .set({ content: next })
        .where(eq(articles.id, row.id));
      cleaned += 1;
      console.log(`Cleaned: ${row.slug}`);
    }
  }

  console.log(`\nDone — ${cleaned}/${rows.length} article(s) updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Failed to clean articles:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
