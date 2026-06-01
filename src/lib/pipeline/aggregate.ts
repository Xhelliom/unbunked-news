import "server-only";

import type { ScrapedArticle } from "@/lib/scrape";
import { clampScore, NEUTRAL_SCORE } from "@/lib/score-criteria";
import { VERDICTS, type Verdict } from "@/lib/verdicts";
import {
  firstToolInput,
  formatArticle,
  getClaude,
  MODEL,
  usageOf,
  type TokenUsage,
} from "./client";
import {
  CLAIM_STATUSES,
  recordAnalysisTool,
  type Analysis,
  type AnalysisClaim,
  type ClaimStatus,
  type AnalysisSource,
} from "./schemas";
import type { VerificationFindings } from "./verify";

export type AggregateResult = {
  analysis: Analysis;
  usage: TokenUsage;
};

const SYSTEM =
  "You are the editor of a fact-checking publication. Using the article and " +
  "the research findings, produce the final assessment. Frame the title as the " +
  "central claim under examination. Ground every claim's status in the cited " +
  "sources; if evidence is insufficient, use 'unverifiable'. The reliability " +
  "score must reflect the overall verdict (reliable ~85-100, nuanced ~60-84, " +
  "biased ~40-59, debunked ~0-39, unverifiable ~50). Break that overall score " +
  "into sub-scores (0-100). Three are mandatory: factuality judges whether the " +
  "claims are true; sourcing judges how solid, independent and verifiable the " +
  "cited references are; neutrality judges the absence of slanted framing or " +
  "strategic omissions. They may diverge — a piece can be factually accurate " +
  "yet heavily biased, or well-meaning yet thinly sourced. Three more are " +
  "optional: completeness (are key facts present vs omitted), transparency " +
  "(author, date, methodology, funding identifiable) and recency (information " +
  "up to date). Provide an optional score ONLY when you can judge it reliably; " +
  "omit the field entirely otherwise — never guess. Write the " +
  "title, summary, " +
  "originalSummary, claim text, and explanations in the same language as the " +
  "article; never translate. The originalSummary must be a neutral paraphrase " +
  "in your own words — never copy sentences from the article. For each claim, " +
  "copy its source_quote verbatim from the article body so it can be located " +
  "in the original text.";

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

function toScore(value: unknown, fallback: number): number {
  return clampScore(value) ?? fallback;
}

// Optional criteria are absent when the model omits them; keep them null rather
// than inventing a value.
function toOptionalScore(value: unknown): number | null {
  return value === null || value === undefined ? null : clampScore(value);
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
        sourceQuote:
          typeof item.sourceQuote === "string" ? item.sourceQuote : "",
        sources: toSources(item.sources),
      },
    ];
  });
}

export async function aggregate(
  article: ScrapedArticle,
  claims: string[],
  verification: VerificationFindings,
): Promise<AggregateResult> {
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

  const reliabilityScore = toScore(input.reliabilityScore, NEUTRAL_SCORE);

  const analysis: Analysis = {
    title: typeof input.title === "string" ? input.title : article.title,
    summary: typeof input.summary === "string" ? input.summary : "",
    originalSummary:
      typeof input.originalSummary === "string" ? input.originalSummary : "",
    language:
      typeof input.language === "string" && input.language.trim().length > 0
        ? input.language.trim().slice(0, 5).toLowerCase()
        : "fr",
    verdict: isVerdict(input.verdict) ? input.verdict : "unverifiable",
    reliabilityScore,
    factualityScore: toScore(input.factualityScore, reliabilityScore),
    sourcingScore: toScore(input.sourcingScore, reliabilityScore),
    neutralityScore: toScore(input.neutralityScore, reliabilityScore),
    completenessScore: toOptionalScore(input.completenessScore),
    transparencyScore: toOptionalScore(input.transparencyScore),
    recencyScore: toOptionalScore(input.recencyScore),
    tags: Array.isArray(input.tags)
      ? input.tags.filter((t): t is string => typeof t === "string")
      : [],
    claims: toClaims(input.claims),
  };

  return { analysis, usage: usageOf(message) };
}
