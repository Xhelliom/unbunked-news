import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { articleTokenUsage, articles } from "@/db/schema";

import { costForUsage } from "./pricing";

// The per-article table is bounded so the page never loads the whole history;
// the headline totals come from a separate SQL aggregate over every row.
const ROW_LIMIT = 100;

export type ArticleUsageRow = {
  articleId: string;
  title: string;
  sourceName: string;
  createdAt: Date;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type TokenUsageTotals = {
  articleCount: number;
  totalTokens: number;
  totalCostUsd: number;
  avgCostUsd: number;
};

export type TokenUsageSummary = TokenUsageTotals & {
  rows: ArticleUsageRow[];
  rowLimit: number;
};

// Cost is priced per model, so we group by model and price each group rather
// than summing a cost the database doesn't store. A handful of groups come
// back regardless of how many articles exist.
async function loadTotals(): Promise<TokenUsageTotals> {
  const groups = await db
    .select({
      model: articleTokenUsage.model,
      articleCount: sql<number>`count(*)::int`,
      inputTokens: sql<string>`coalesce(sum(${articleTokenUsage.inputTokens}), 0)::bigint`,
      outputTokens: sql<string>`coalesce(sum(${articleTokenUsage.outputTokens}), 0)::bigint`,
      cacheCreationTokens: sql<string>`coalesce(sum(${articleTokenUsage.cacheCreationTokens}), 0)::bigint`,
      cacheReadTokens: sql<string>`coalesce(sum(${articleTokenUsage.cacheReadTokens}), 0)::bigint`,
    })
    .from(articleTokenUsage)
    .groupBy(articleTokenUsage.model);

  let articleCount = 0;
  let totalTokens = 0;
  let totalCostUsd = 0;

  for (const group of groups) {
    const inputTokens = Number(group.inputTokens);
    const outputTokens = Number(group.outputTokens);
    const cacheCreationTokens = Number(group.cacheCreationTokens);
    const cacheReadTokens = Number(group.cacheReadTokens);

    articleCount += group.articleCount;
    totalTokens +=
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
    totalCostUsd += costForUsage(group.model, {
      inputTokens,
      outputTokens,
      cacheCreationTokens,
      cacheReadTokens,
    });
  }

  return {
    articleCount,
    totalTokens,
    totalCostUsd,
    avgCostUsd: articleCount > 0 ? totalCostUsd / articleCount : 0,
  };
}

async function loadRecentRows(): Promise<ArticleUsageRow[]> {
  const records = await db
    .select({
      articleId: articleTokenUsage.articleId,
      title: articles.title,
      sourceName: articles.sourceName,
      createdAt: articleTokenUsage.createdAt,
      model: articleTokenUsage.model,
      inputTokens: articleTokenUsage.inputTokens,
      outputTokens: articleTokenUsage.outputTokens,
      cacheCreationTokens: articleTokenUsage.cacheCreationTokens,
      cacheReadTokens: articleTokenUsage.cacheReadTokens,
    })
    .from(articleTokenUsage)
    .innerJoin(articles, eq(articleTokenUsage.articleId, articles.id))
    .orderBy(desc(articleTokenUsage.createdAt))
    .limit(ROW_LIMIT);

  return records.map((record) => {
    const cacheTokens = record.cacheCreationTokens + record.cacheReadTokens;
    return {
      articleId: record.articleId,
      title: record.title,
      sourceName: record.sourceName,
      createdAt: record.createdAt,
      model: record.model,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      cacheTokens,
      totalTokens: record.inputTokens + record.outputTokens + cacheTokens,
      costUsd: costForUsage(record.model, {
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        cacheCreationTokens: record.cacheCreationTokens,
        cacheReadTokens: record.cacheReadTokens,
      }),
    };
  });
}

export async function loadTokenUsageSummary(): Promise<TokenUsageSummary> {
  const [totals, rows] = await Promise.all([loadTotals(), loadRecentRows()]);
  return { ...totals, rows, rowLimit: ROW_LIMIT };
}
