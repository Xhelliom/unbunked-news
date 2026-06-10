import { getTranslations } from "next-intl/server";

import { CLAIM_STATUSES, type ClaimStatus } from "@/lib/claim-status";
import type { PublicContribution } from "@/lib/contributions/queries";
import type { ReadingParagraph } from "@/lib/reading";
import { ArticleReader } from "@/components/article-reader";
import { ClaimCard, type ClaimCardData } from "@/components/claim-card";

type Props = {
  paragraphs: ReadingParagraph[];
  readerClaims: ClaimCardData[];
  claimContributions: PublicContribution[][];
  claimIds: string[];
  orphanCards: ClaimCardData[];
  articleId: string;
  isAuthenticated: boolean;
  showSummaryInstead: boolean;
  originalSummary: string | null;
};

// The default "analysis" view: the original body annotated with verification on
// the right rail, or a safe paraphrase when the body is withheld, plus any
// claims that couldn't be anchored to a paragraph.
export async function ArticleAnalysisView({
  paragraphs,
  readerClaims,
  claimContributions,
  claimIds,
  orphanCards,
  articleId,
  isAuthenticated,
  showSummaryInstead,
  originalSummary,
}: Props) {
  const t = await getTranslations("article");
  const tStatus = await getTranslations("claimStatus");

  const hasBody = paragraphs.length > 0;
  const statusLabels = Object.fromEntries(
    CLAIM_STATUSES.map((status) => [status, tStatus(status)]),
  ) as Record<ClaimStatus, string>;

  return (
    <>
      {showSummaryInstead && (
        <section className="mt-12 max-w-[760px]">
          <h2 className="font-serif text-sm font-semibold tracking-[0.05em] uppercase">
            {t("originalSummaryTitle")}
          </h2>
          <p className="mt-3 font-serif text-lg leading-[1.7] text-pretty">
            {originalSummary}
          </p>
        </section>
      )}

      {hasBody && (
        <section className="mt-14">
          <header className="max-w-[720px]">
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              {t("readingIntroTitle")}
            </h2>
            <p className="text-muted-foreground mt-1.5 text-sm">
              {t("readingIntroSubtitle")}
            </p>
          </header>

          <div
            className="mt-6 mb-2 hidden border-b pb-3 lg:grid lg:grid-cols-[1fr_320px] lg:gap-6"
            aria-hidden
          >
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
              {t("colOriginal")}
            </span>
            <span className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
              {t("colVerification")}
            </span>
          </div>

          <ArticleReader
            paragraphs={paragraphs}
            claims={readerClaims}
            claimContributions={claimContributions}
            claimIds={claimIds}
            articleId={articleId}
            isAuthenticated={isAuthenticated}
            statusLabels={statusLabels}
            sourcesLabel={t("sourcesConsulted")}
            verificationLabel={t("verificationTag")}
            peekLabel={t("peekHint")}
            railLabel={t("railClaimLabel")}
          />
        </section>
      )}

      {orphanCards.length > 0 && (
        <section className="mt-14 max-w-[760px]">
          <h2 className="font-serif text-2xl font-bold tracking-tight">
            {hasBody ? t("otherChecks") : t("claimsTitle")}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {orphanCards.map((claim, index) => (
              <ClaimCard
                key={index}
                claim={claim}
                sourcesLabel={t("sourcesConsulted")}
                verificationLabel={t("verificationTag")}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
