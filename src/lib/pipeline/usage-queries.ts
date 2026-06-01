import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { articleTokenUsage, articles } from "@/db/schema";

import { costForSearch, costForUsage } from "./pricing";

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
  searchRequests: number;
  // Combined token + web search cost for the article.
  costUsd: number;
};

export type TokenUsageTotals = {
  articleCount: number;
  totalTokens: number;
  totalSearchRequests: number;
  // Web search portion of totalCostUsd, surfaced so the dashboard can show how
  // much of the spend is search rather than tokens.
  searchCostUsd: number;
  totalCostUsd: number;
  avgCostUsd: number;
};

export type TokenUsageSummary = TokenUsageTotals & {
  rows: ArticleUsageRow[];
  rowLimit: number;
};

// Tokens are priced per model and search per provider, so we group by both and
// price each group rather than summing a cost the database doesn't store. A
// handful of groups come back regardless of how many articles exist.
async function loadTotals(): Promise<TokenUsageTotals> {
  const groups = await db
    .select({
      model: articleTokenUsage.model,
      searchProvider: articleTokenUsage.searchProvider,
      articleCount: sql<number>`count(*)::int`,
      inputTokens: sql<string>`coalesce(sum(${articleTokenUsage.inputTokens}), 0)::bigint`,
      outputTokens: sql<string>`coalesce(sum(${articleTokenUsage.outputTokens}), 0)::bigint`,
      cacheCreationTokens: sql<string>`coalesce(sum(${articleTokenUsage.cacheCreationTokens}), 0)::bigint`,
      cacheReadTokens: sql<string>`coalesce(sum(${articleTokenUsage.cacheReadTokens}), 0)::bigint`,
      webSearchRequests: sql<string>`coalesce(sum(${articleTokenUsage.webSearchRequests}), 0)::bigint`,
    })
    .from(articleTokenUsage)
    .groupBy(articleTokenUsage.model, articleTokenUsage.searchProvider);

  let articleCount = 0;
  let totalTokens = 0;
  let totalSearchRequests = 0;
  let searchCostUsd = 0;
  let totalCostUsd = 0;

  for (const group of groups) {
    const inputTokens = Number(group.inputTokens);
    const outputTokens = Number(group.outputTokens);
    const cacheCreationTokens = Number(group.cacheCreationTokens);
    const cacheReadTokens = Number(group.cacheReadTokens);
    const webSearchRequests = Number(group.webSearchRequests);
    const groupSearchCost = costForSearch(
      group.searchProvider,
      webSearchRequests,
    );

    articleCount += group.articleCount;
    totalTokens +=
      inputTokens + outputTokens + cacheCreationTokens + cacheReadTokens;
    totalSearchRequests += webSearchRequests;
    searchCostUsd += groupSearchCost;
    totalCostUsd +=
      costForUsage(group.model, {
        inputTokens,
        outputTokens,
        cacheCreationTokens,
        cacheReadTokens,
      }) + groupSearchCost;
  }

  return {
    articleCount,
    totalTokens,
    totalSearchRequests,
    searchCostUsd,
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
      webSearchRequests: articleTokenUsage.webSearchRequests,
      searchProvider: articleTokenUsage.searchProvider,
    })
    .from(articleTokenUsage)
    .innerJoin(articles, eq(articleTokenUsage.articleId, articles.id))
    .orderBy(desc(articleTokenUsage.createdAt))
    .limit(ROW_LIMIT);

  return records.map((record) => {
    const cacheTokens = record.cacheCreationTokens + record.cacheReadTokens;
    const tokenCost = costForUsage(record.model, {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      cacheCreationTokens: record.cacheCreationTokens,
      cacheReadTokens: record.cacheReadTokens,
    });
    const searchCost = costForSearch(
      record.searchProvider,
      record.webSearchRequests,
    );
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
      searchRequests: record.webSearchRequests,
      costUsd: tokenCost + searchCost,
    };
  });
}

export async function loadTokenUsageSummary(): Promise<TokenUsageSummary> {
  const [totals, rows] = await Promise.all([loadTotals(), loadRecentRows()]);
  return { ...totals, rows, rowLimit: ROW_LIMIT };
}
