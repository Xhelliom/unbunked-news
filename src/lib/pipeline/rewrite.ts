import "server-only";

import type { ScrapedArticle } from "@/lib/scrape";
import {
  firstToolInput,
  formatArticle,
  getClaude,
  usageOf,
  type TokenUsage,
} from "./client";
import { toolCallDiagnostic, type StepDiagnostic } from "./diagnostics";
import {
  recordRewriteTool,
  type Analysis,
  type AnalysisClaim,
  type Rewrite,
} from "./schemas";

// A full-article rewrite in markdown can be long; 4096 truncated the body on
// longer pieces, dropping trailing paragraphs and [[claim:N]] markers.
const MAX_TOKENS = 8192;

export type RewriteResult = {
  rewrite: Rewrite;
  usage: TokenUsage;
  diagnostic: StepDiagnostic;
};

const LOCALE_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
};

function languageOf(locale: string): string {
  return LOCALE_NAMES[locale] ?? locale;
}

function claimsBrief(claims: AnalysisClaim[]): string {
  return claims
    .map(
      (c, i) =>
        `${i + 1}. [${c.status.toUpperCase()}] ${c.text}` +
        (c.explanation ? `\n   → ${c.explanation}` : ""),
    )
    .join("\n");
}

const SYSTEM =
  "You are an Unbunked editor producing a 'fiable' (trustworthy) rewrite of a " +
  "fact-checked article. Rules:\n" +
  "1. Preserve the tone, voice and structure (headings, paragraph flow) of the " +
  "original, but rewrite EVERYTHING in your own words — never copy sentences " +
  "from the source.\n" +
  "2. Correct or nuance every claim whose status is 'false', 'misleading' or " +
  "'partly_true' directly inline (don't just append a disclaimer).\n" +
  "3. Right after any sentence where you correct, nuance or rely on a checked " +
  "claim, append the marker [[claim:N]] (1-based, matching the claim list).\n" +
  "4. Output markdown. Headings allowed (##, ###). No HTML, no images.\n" +
  "5. Write entirely in the target language requested.";

export async function rewriteArticle(
  article: ScrapedArticle,
  analysis: Analysis,
  locale: string,
  model: string,
): Promise<RewriteResult> {
  const client = getClaude();
  const language = languageOf(locale);

  const message = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM,
    tools: [recordRewriteTool],
    tool_choice: { type: "tool", name: "record_rewrite" },
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
              `TARGET LANGUAGE: ${language}`,
              "",
              `OUR VERDICT: ${analysis.verdict} (reliability ${analysis.reliabilityScore ?? "—"}/100)`,
              `OUR SUMMARY: ${analysis.summary}`,
              "",
              `CHECKED CLAIMS:\n${claimsBrief(analysis.claims)}`,
              "",
              `Produce the Unbunked rewrite in ${language}. Insert [[claim:N]] markers as instructed.`,
            ].join("\n"),
          },
        ],
      },
    ],
  });

  const input = firstToolInput(message, "record_rewrite");
  if (!input) {
    throw new Error(`Rewrite (${locale}) did not return a structured result`);
  }

  const body = typeof input.body === "string" ? input.body : "";
  const warnings: string[] = [];
  if (body.trim().length === 0) warnings.push(`empty rewrite body (${locale})`);

  const diagnostic = toolCallDiagnostic(
    "rewriting",
    model,
    message,
    { locale, bodyChars: body.length },
    warnings,
  );

  return {
    rewrite: {
      locale,
      title: typeof input.title === "string" ? input.title : analysis.title,
      body,
    },
    usage: usageOf(message),
    diagnostic,
  };
}
