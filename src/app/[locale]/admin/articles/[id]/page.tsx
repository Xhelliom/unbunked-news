import { eq } from "drizzle-orm";
import { Eye } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";
import { CriteriaEvidence } from "@/components/admin/criteria-evidence";
import { ReviewForm } from "@/components/admin/review-form";
import { RewriteForm } from "@/components/admin/rewrite-form";
import { ScrapeDebug } from "@/components/admin/scrape-debug";
import { ScrapedBody } from "@/components/admin/scraped-body";

export default async function AdminArticleReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, id),
    with: {
      claims: {
        orderBy: (claim, { asc }) => [asc(claim.position)],
        with: { sources: true },
      },
      rewrites: true,
    },
  });
  if (!article) {
    notFound();
  }

  const t = await getTranslations("admin.review");
  const ts = await getTranslations("claimStatus");
  const tRubric = await getTranslations("rubrics");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {article.verdict && <VerdictBadge verdict={article.verdict} />}
          <a
            href={article.urlOrigine}
            target="_blank"
            rel="noreferrer noopener"
            className="text-muted-foreground hover:text-foreground text-sm underline"
          >
            {t("source")}: {article.sourceName}
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-2xl font-bold tracking-tight">
            {t("title")}
          </h1>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link
              href={`/preview/articles/${article.id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye className="size-3.5" />
              {t("preview")}
            </Link>
          </Button>
        </div>
      </div>

      <ReviewForm
        key={article.id}
        id={article.id}
        title={article.title}
        summary={article.summary}
        originalSummary={article.originalSummary}
        showOriginal={article.showOriginal}
        verdict={article.verdict}
        reliabilityScore={article.reliabilityScore}
        factualityScore={article.factualityScore}
        corroborationScore={article.corroborationScore}
        sourcingScore={article.sourcingScore}
        completenessScore={article.completenessScore}
        transparencyScore={article.transparencyScore}
        recencyScore={article.recencyScore}
        contributionsEnabled={article.contributionsEnabled}
        published={article.published}
        isDeleted={article.deletedAt !== null}
      />

      <CriteriaEvidence evidence={article.evidence} />

      <ScrapeDebug provenance={article.scrapeDebug} />

      <ScrapedBody content={article.content} />

      <div className="space-y-4">
        <h2 className="font-serif text-lg font-bold">
          {t("rewrites.title")}
        </h2>
        <div className="space-y-6">
          {routing.locales.map((loc) => {
            const r = article.rewrites.find((row) => row.locale === loc);
            return (
              <div key={loc} className="rounded-lg border p-4">
                <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
                  {loc}
                </p>
                <RewriteForm
                  articleId={article.id}
                  locale={loc}
                  title={r?.title ?? article.title}
                  body={r?.body ?? ""}
                  claims={article.claims.map((claim) => claim.claimText)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {article.rubric && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">{t("rubric")}</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{tRubric(`${article.rubric}.label`)}</Badge>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="font-serif text-lg font-bold">{t("claims")}</h2>
        {article.claims.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noClaims")}</p>
        ) : (
          <ul className="space-y-4">
            {article.claims.map((claim) => (
              <li key={claim.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{claim.claimText}</p>
                  <Badge variant="outline" className="shrink-0">
                    {ts(claim.status)}
                  </Badge>
                </div>
                {claim.explanation && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {claim.explanation}
                  </p>
                )}
                {claim.sources.length > 0 && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide">
                      {t("sources")}
                    </p>
                    <ul className="space-y-1">
                      {claim.sources.map((source) => (
                        <li key={source.id}>
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-primary text-sm underline"
                          >
                            {source.title ?? source.url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
