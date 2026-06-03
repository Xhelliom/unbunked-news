import { Fragment } from "react";

import { useTranslations } from "next-intl";

import type {
  MetricValue,
  RunDiagnostics,
  StepDiagnostic,
} from "@/lib/pipeline/diagnostics";

function formatMetric(value: MetricValue, yes: string, no: string): string {
  if (value === null) return "—";
  if (typeof value === "boolean") return value ? yes : no;
  return String(value);
}

// Read-only, per-step audit of a pipeline run. Native <details> keeps this a
// server component. Labels are translated; metric keys and warnings are the
// raw technical payload captured during the run (like the `error` column).
export function RunDiagnostics({
  diagnostics,
}: {
  diagnostics: RunDiagnostics | null;
}) {
  const t = useTranslations("admin.job");

  if (!diagnostics || diagnostics.steps.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("diagnostics.title")}</h2>
        <p className="text-muted-foreground text-sm">{t("diagnostics.empty")}</p>
      </section>
    );
  }

  const yes = t("diagnostics.yes");
  const no = t("diagnostics.no");

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{t("diagnostics.title")}</h2>
      <div className="space-y-2">
        {diagnostics.steps.map((step, index) => (
          <StepPanel
            key={`${step.step}-${index}`}
            step={step}
            label={t(`steps.${step.step}`)}
            labels={{
              model: t("diagnostics.model"),
              stopReason: t("diagnostics.stopReason"),
              outputTokens: t("diagnostics.outputTokens"),
              truncated: t("diagnostics.truncated"),
              warnings: t("diagnostics.warnings"),
              yes,
              no,
            }}
          />
        ))}
      </div>
    </section>
  );
}

type StepLabels = {
  model: string;
  stopReason: string;
  outputTokens: string;
  truncated: string;
  warnings: string;
  yes: string;
  no: string;
};

function StepPanel({
  step,
  label,
  labels,
}: {
  step: StepDiagnostic;
  label: string;
  labels: StepLabels;
}) {
  const hasWarnings = step.warnings.length > 0;

  return (
    <details className="rounded-lg border" open={step.truncated || hasWarnings}>
      <summary className="flex cursor-pointer items-center gap-2 p-4 text-sm font-semibold">
        {label}
        {step.truncated && (
          <span className="bg-destructive rounded px-1.5 py-0.5 text-xs font-normal text-white">
            {labels.truncated}
          </span>
        )}
        {hasWarnings && (
          <span className="text-muted-foreground text-xs font-normal">
            ⚠ {step.warnings.length}
          </span>
        )}
      </summary>
      <div className="space-y-3 border-t p-4">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
          {step.model && (
            <>
              <dt className="text-muted-foreground">{labels.model}</dt>
              <dd>
                <code>{step.model}</code>
              </dd>
            </>
          )}
          {step.stopReason && (
            <>
              <dt className="text-muted-foreground">{labels.stopReason}</dt>
              <dd>
                <code>{step.stopReason}</code>
              </dd>
            </>
          )}
          {step.outputTokens !== null && (
            <>
              <dt className="text-muted-foreground">{labels.outputTokens}</dt>
              <dd>{step.outputTokens}</dd>
            </>
          )}
          {Object.entries(step.metrics).map(([key, value]) => (
            <Fragment key={key}>
              <dt className="text-muted-foreground">{key}</dt>
              <dd>{formatMetric(value, labels.yes, labels.no)}</dd>
            </Fragment>
          ))}
        </dl>

        {hasWarnings && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-semibold uppercase">
              {labels.warnings}
            </p>
            <ul className="list-inside list-disc text-sm text-amber-600">
              {step.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}
