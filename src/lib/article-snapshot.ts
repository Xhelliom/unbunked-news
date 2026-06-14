import type { AnalysisEvidence } from "@/lib/pipeline/schemas";

// A frozen copy of an article's analysis, captured before an in-place
// re-analysis overwrites it. Enum-typed columns are stored as plain strings so a
// later change to a verdict/rubric set can't break the replay of an old version.
// The scraped body is intentionally excluded: it stays on the live article row.
export type SnapshotClaimSource = {
  url: string;
  title: string | null;
  publisher: string | null;
};

export type SnapshotClaim = {
  position: number;
  claimText: string;
  status: string;
  explanation: string | null;
  sourceQuote: string | null;
  sources: SnapshotClaimSource[];
};

export type SnapshotRewrite = {
  locale: string;
  title: string;
  body: string;
};

export type ArticleSnapshotData = {
  capturedAt: string;
  title: string;
  summary: string | null;
  originalSummary: string | null;
  verdict: string | null;
  reliabilityScore: number | null;
  factualityScore: number | null;
  corroborationScore: number | null;
  sourcingScore: number | null;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
  framing: string | null;
  contentType: string | null;
  globalConfidence: string | null;
  criteriaVersion: string | null;
  modelVersion: string | null;
  evidence: AnalysisEvidence | null;
  rubric: string | null;
  locale: string;
  keywords: string[];
  claims: SnapshotClaim[];
  rewrites: SnapshotRewrite[];
};

// The subset of a loaded article (with its claims, rewrites and keywords) the
// snapshot reads. Declared structurally so this module stays free of a runtime
// dependency on the Drizzle schema (which imports ArticleSnapshotData back).
export type ArticleSnapshotSource = {
  title: string;
  summary: string | null;
  originalSummary: string | null;
  verdict: string | null;
  reliabilityScore: number | null;
  factualityScore: number | null;
  corroborationScore: number | null;
  sourcingScore: number | null;
  completenessScore: number | null;
  transparencyScore: number | null;
  recencyScore: number | null;
  framing: string | null;
  contentType: string | null;
  globalConfidence: string | null;
  criteriaVersion: string | null;
  modelVersion: string | null;
  evidence: AnalysisEvidence | null;
  rubric: string | null;
  locale: string;
  keywords: { keyword: string }[];
  claims: {
    position: number;
    claimText: string;
    status: string;
    explanation: string | null;
    sourceQuote: string | null;
    sources: { url: string; title: string | null; publisher: string | null }[];
  }[];
  rewrites: { locale: string; title: string; body: string }[];
};

export function buildArticleSnapshot(
  article: ArticleSnapshotSource,
): ArticleSnapshotData {
  return {
    capturedAt: new Date().toISOString(),
    title: article.title,
    summary: article.summary,
    originalSummary: article.originalSummary,
    verdict: article.verdict,
    reliabilityScore: article.reliabilityScore,
    factualityScore: article.factualityScore,
    corroborationScore: article.corroborationScore,
    sourcingScore: article.sourcingScore,
    completenessScore: article.completenessScore,
    transparencyScore: article.transparencyScore,
    recencyScore: article.recencyScore,
    framing: article.framing,
    contentType: article.contentType,
    globalConfidence: article.globalConfidence,
    criteriaVersion: article.criteriaVersion,
    modelVersion: article.modelVersion,
    evidence: article.evidence,
    rubric: article.rubric,
    locale: article.locale,
    keywords: article.keywords.map((row) => row.keyword),
    claims: article.claims.map((claim) => ({
      position: claim.position,
      claimText: claim.claimText,
      status: claim.status,
      explanation: claim.explanation,
      sourceQuote: claim.sourceQuote,
      sources: claim.sources.map((source) => ({
        url: source.url,
        title: source.title,
        publisher: source.publisher,
      })),
    })),
    rewrites: article.rewrites.map((rewrite) => ({
      locale: rewrite.locale,
      title: rewrite.title,
      body: rewrite.body,
    })),
  };
}
