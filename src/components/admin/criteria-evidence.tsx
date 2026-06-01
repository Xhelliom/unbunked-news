import { useTranslations } from "next-intl";

import {
  KILLSWITCH_FLAGS,
  SCORE_CRITERIA,
  type CriterionAssessment,
} from "@/lib/score-criteria";
import type { AnalysisEvidence } from "@/lib/pipeline/schemas";

// Operator-facing audit of the AI's per-criterion reasoning and the killswitch
// signals, so a reviewer can replay the verdict (docs/SCORING.md §12). Reads the
// frozen `evidence` snapshot; renders nothing for pre-v1.2 rows without it.
export function CriteriaEvidence({
  evidence,
}: {
  evidence: AnalysisEvidence | null;
}) {
  const tc = useTranslations("criteria");
  const t = useTranslations("admin.review");
  if (!evidence) return null;

  const raisedFlags = KILLSWITCH_FLAGS.filter(
    (flag) => evidence.killswitch[flag]?.value,
  );

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg font-bold">{t("evidenceTitle")}</h2>
      <ul className="space-y-3">
        {SCORE_CRITERIA.map((criterion) => {
          const assessment: CriterionAssessment | null | undefined =
            evidence.criteria[criterion];
          if (!assessment) return null;
          return (
            <li key={criterion} className="rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{tc(`${criterion}.label`)}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  L{assessment.level} · {assessment.score} ·{" "}
                  {assessment.confidence}
                </span>
              </div>
              {assessment.rationale && (
                <p className="text-muted-foreground mt-1">
                  {assessment.rationale}
                </p>
              )}
              {assessment.sources.length > 0 && (
                <ul className="mt-2 space-y-0.5">
                  {assessment.sources.map((source) => (
                    <li key={source}>
                      <a
                        href={source}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-primary break-all text-xs underline"
                      >
                        {source}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      {raisedFlags.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">{t("killswitchTitle")}</h3>
          <ul className="space-y-1 text-sm">
            {raisedFlags.map((flag) => (
              <li key={flag}>
                <span className="text-verdict-debunked-fg font-medium">
                  {flag}
                </span>
                {evidence.killswitch[flag].rationale && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {evidence.killswitch[flag].rationale}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
