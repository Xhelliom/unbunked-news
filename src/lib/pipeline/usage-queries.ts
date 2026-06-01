import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { articleTokenUsage, articles } from "@/db/schema";

import { costForUsage } from "./pricing";

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

export type TokenUsageSummary = {
  rows: ArticleUsageRow[];
  articleCount: number;
  totalTokens: number;
  totalCostUsd: number;
  avgCostUsd: number;
};

export async function loadTokenUsageSummary(): Promise<TokenUsageSummary> {
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
    .orderBy(desc(articleTokenUsage.createdAt));

  const rows: ArticleUsageRow[] = records.map((record) => {
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

  const totalTokens = rows.reduce((sum, row) => sum + row.totalTokens, 0);
  const totalCostUsd = rows.reduce((sum, row) => sum + row.costUsd, 0);

  return {
    rows,
    articleCount: rows.length,
    totalTokens,
    totalCostUsd,
    avgCostUsd: rows.length > 0 ? totalCostUsd / rows.length : 0,
  };
}
