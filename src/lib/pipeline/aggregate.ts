import "server-only";

import type { ScrapedArticle } from "@/lib/scrape";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import { firstToolInput, formatArticle, getClaude, MODEL } from "./client";
import {
  CLAIM_STATUSES,
  recordAnalysisTool,
  type Analysis,
  type AnalysisClaim,
  type ClaimStatus,
  type AnalysisSource,
} from "./schemas";
import type { VerificationFindings } from "./verify";

const SYSTEM =
  "You are the editor of a fact-checking publication. Using the article and " +
  "the research findings, produce the final assessment. Frame the title as the " +
  "central claim under examination. Ground every claim's status in the cited " +
  "sources; if evidence is insufficient, use 'unverifiable'. The reliability " +
  "score must reflect the overall verdict (reliable ~85-100, nuanced ~60-84, " +
  "biased ~40-59, debunked ~0-39, unverifiable ~50).";

function isVerdict(value: unknown): value is Verdict {
  return (
    typeof value === "string" && (VERDICTS as readonly string[]).includes(value)
  );
}

function toClaimStatus(value: unknown): ClaimStatus {
  return typeof value === "string" &&
    (CLAIM_STATUSES as readonly string[]).includes(value)
    ? (value as ClaimStatus)
    : "unverifiable";
}

function toSources(value: unknown): AnalysisSource[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (item && typeof item === "object" && typeof item.url === "string") {
      return [{ url: item.url, title: String(item.title ?? item.url) }];
    }
    return [];
  });
}

function toClaims(value: unknown): AnalysisClaim[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof item.text !== "string") {
      return [];
    }
    return [
      {
        text: item.text,
        status: toClaimStatus(item.status),
        explanation: typeof item.explanation === "string" ? item.explanation : "",
        sources: toSources(item.sources),
      },
    ];
  });
}

export async function aggregate(
  article: ScrapedArticle,
  claims: string[],
  verification: VerificationFindings,
): Promise<Analysis> {
  const client = getClaude();
  const sourceList = verification.sources
    .map((s) => `- ${s.title}: ${s.url}`)
    .join("\n");

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM,
    tools: [recordAnalysisTool],
    tool_choice: { type: "tool", name: "record_analysis" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: formatArticle(article),
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: [
              `CLAIMS:\n${claims.map((c, i) => `${i + 1}. ${c}`).join("\n")}`,
              "",
              `RESEARCH FINDINGS:\n${verification.findings}`,
              "",
              `SOURCES FOUND:\n${sourceList || "(none)"}`,
              "",
              "Record the final fact-check. Only cite URLs from the sources found above.",
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const input = firstToolInput(message, "record_analysis");
  if (!input) {
    throw new Error("Aggregation did not return a structured analysis");
  }

  const rawScore = Number(input.reliabilityScore);
  const reliabilityScore = Number.isFinite(rawScore)
    ? Math.min(100, Math.max(0, Math.round(rawScore)))
    : 50;

  return {
    title: typeof input.title === "string" ? input.title : article.title,
    summary: typeof input.summary === "string" ? input.summary : "",
    verdict: isVerdict(input.verdict) ? input.verdict : "unverifiable",
    reliabilityScore,
    tags: Array.isArray(input.tags)
      ? input.tags.filter((t): t is string => typeof t === "string")
      : [],
    claims: toClaims(input.claims),
  };
}
