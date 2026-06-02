import { useTranslations } from "next-intl";

import type { ScrapeProvenance } from "@/lib/scrape";

// Read-only diagnostics of how the article body was scraped, collapsed by
// default, so an admin can tell at a glance which stage produced the stored
// body and why a fallback kicked in. Native <details> keeps this a server
// component.
export function ScrapeDebug({
  provenance,
}: {
  provenance: ScrapeProvenance | null;
}) {
  const t = useTranslations("admin.review");

  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer p-4 text-sm font-semibold">
        {t("scrapeDebug")}
        {provenance && (
          <code className="text-muted-foreground ml-2 font-normal">
            {provenance.method}
          </code>
        )}
      </summary>
      <div className="border-t p-4">
        {provenance === null ? (
          <p className="text-muted-foreground text-sm">{t("scrapeDebugEmpty")}</p>
        ) : (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t("scrapeMethod")}</dt>
            <dd>
              <code>{provenance.method}</code>
            </dd>

            <dt className="text-muted-foreground">{t("scrapeRendered")}</dt>
            <dd>{provenance.rendered ? t("scrapeYes") : t("scrapeNo")}</dd>

            {provenance.candidateBlocks !== null && (
              <>
                <dt className="text-muted-foreground">
                  {t("scrapeCandidateBlocks")}
                </dt>
                <dd>{provenance.candidateBlocks}</dd>
              </>
            )}

            <dt className="text-muted-foreground">{t("scrapeContentChars")}</dt>
            <dd>{t("scrapedBodyChars", { count: provenance.contentChars })}</dd>

            {provenance.aiTriggerReason && (
              <>
                <dt className="text-muted-foreground">{t("scrapeTrigger")}</dt>
                <dd>{provenance.aiTriggerReason}</dd>
              </>
            )}
          </dl>
        )}
      </div>
    </details>
  );
}
