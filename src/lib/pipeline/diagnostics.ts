import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { messageMeta } from "./client";
import type { ScrapeProvenance } from "@/lib/scrape";

// One entry per pipeline phase, in run order. Reuses the same labels as the
// live `jobs.step` column so the admin diagnostics panel can translate them
// through the existing `admin.job.steps.*` keys.
export const PIPELINE_STEPS = [
  "scraping",
  "extracting",
  "verifying",
  "aggregating",
  "assessing-claims",
  "rewriting",
  "saving",
] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

export type MetricValue = string | number | boolean | null;

// What an admin sees for one phase: the model that ran it, why the model
// stopped, how big the output was, whether it was cut off at max_tokens, the
// phase-specific metrics worth eyeballing, and any non-fatal warnings raised.
export type StepDiagnostic = {
  step: PipelineStep;
  model: string | null;
  stopReason: string | null;
  outputTokens: number | null;
  truncated: boolean;
  metrics: Record<string, MetricValue>;
  warnings: string[];
};

// Frozen, per-run audit trail persisted on the job row (jobs.diagnostics), so a
// degraded or empty result can be explained after the fact without re-running.
export type RunDiagnostics = {
  steps: StepDiagnostic[];
};

// Builds the diagnostic for a forced-tool phase (extract, aggregate, rewrite)
// from its Claude response. A truncated tool call is flagged here so the
// orchestrator can fail the run loudly instead of persisting an amputated result.
export function toolCallDiagnostic(
  step: PipelineStep,
  model: string,
  message: Anthropic.Message,
  metrics: Record<string, MetricValue>,
  warnings: string[],
): StepDiagnostic {
  const meta = messageMeta(message);
  return {
    step,
    model,
    stopReason: meta.stopReason,
    outputTokens: meta.outputTokens,
    truncated: meta.truncated,
    metrics,
    warnings: meta.truncated
      ? [...warnings, `output truncated at max_tokens (${meta.outputTokens})`]
      : warnings,
  };
}

export function scrapeDiagnostic(
  provenance: ScrapeProvenance | null,
  contentChars: number,
  shortBodyThreshold: number,
): StepDiagnostic {
  const warnings: string[] = [];
  if (contentChars === 0) {
    warnings.push("scraped body is empty");
  } else if (contentChars < shortBodyThreshold) {
    warnings.push(`scraped body is short (${contentChars} chars)`);
  }
  return {
    step: "scraping",
    model: null,
    stopReason: null,
    outputTokens: null,
    truncated: false,
    metrics: {
      method: provenance?.method ?? null,
      rendered: provenance?.rendered ?? null,
      candidateBlocks: provenance?.candidateBlocks ?? null,
      contentChars,
      aiTriggerReason: provenance?.aiTriggerReason ?? null,
    },
    warnings,
  };
}

export function saveDiagnostic(metrics: {
  claimsSaved: number;
  claimSourcesSaved: number;
  tagsRequested: number;
  tagsLinked: number;
  keywordsRequested: number;
  keywordsStored: number;
}): StepDiagnostic {
  const warnings: string[] = [];
  const droppedTags = metrics.tagsRequested - metrics.tagsLinked;
  const droppedKeywords = metrics.keywordsRequested - metrics.keywordsStored;
  if (droppedTags > 0) {
    warnings.push(`${droppedTags} tag(s) dropped (slug collision/empty)`);
  }
  if (droppedKeywords > 0) {
    warnings.push(`${droppedKeywords} keyword(s) dropped (slug collision/empty)`);
  }
  return {
    step: "saving",
    model: null,
    stopReason: null,
    outputTokens: null,
    truncated: false,
    metrics: { ...metrics },
    warnings,
  };
}
