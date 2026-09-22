import { ArrowRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { FeedImageOverlay } from "@/components/feed-image-overlay";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function HeroCard({ article }: { article: FeedArticle }) {
  const t = useTranslations("feed");
  const tr = useTranslations("rubrics");
  const format = useFormatter();
  const rubric = article.rubric ? tr(`${article.rubric}.label`) : undefined;

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card grid overflow-hidden rounded-2xl border transition-shadow hover:shadow-sm lg:grid-cols-[1.05fr_1fr]"
    >
      <div className="border-border relative flex aspect-[16/9] items-center justify-center overflow-hidden lg:aspect-auto lg:min-h-[400px] lg:border-r">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
          labelClassName="text-xl tracking-[0.12em]"
        />
        <FeedImageOverlay
          verdict={article.verdict}
          score={article.reliabilityScore}
          className="p-[18px]"
        />
      </div>

      <div className="flex flex-col gap-3.5 p-8">
        <span className="text-primary inline-flex w-fit items-center gap-2 text-[11px] font-bold tracking-[0.08em] whitespace-nowrap uppercase">
          <span className="bg-primary size-2 shrink-0 rounded-full" />
          <span>
            {t("featured")}
            {rubric ? ` · ${rubric}` : ""}
          </span>
        </span>
        <h2 className="group-hover:text-primary font-serif text-3xl leading-[1.08] font-extrabold tracking-tight text-balance transition-colors lg:text-4xl">
          {article.title}
        </h2>
        {article.summary && (
          <p className="text-muted-foreground line-clamp-3 text-[15px] leading-[1.55]">
            {article.summary}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-2.5 border-t pt-5">
          <span className="text-xs font-semibold tracking-[0.05em] uppercase">
            {article.sourceName}
          </span>
          {article.publishedAt && (
            <>
              <span className="text-muted-foreground text-[13px]">·</span>
              <span className="text-muted-foreground text-[13px] whitespace-nowrap">
                {format.dateTime(article.publishedAt, {
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </>
          )}
          <span className="text-primary ml-auto inline-flex items-center gap-1.5 text-[13px] font-semibold whitespace-nowrap">
            {t("readArticle")}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
