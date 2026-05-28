import { ArrowRight } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { VerdictBadge } from "@/components/verdict-badge";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function HeroCard({ article }: { article: FeedArticle }) {
  const t = useTranslations("feed");
  const format = useFormatter();
  const tag = article.articleTags[0]?.tag.label;

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
        {article.verdict && (
          <div className="absolute top-[18px] left-[18px]">
            <VerdictBadge verdict={article.verdict} />
          </div>
        )}
        {article.reliabilityScore !== null && (
          <span className="bg-background/90 ring-border absolute right-[18px] bottom-[18px] inline-flex items-baseline gap-1 rounded-xl px-3.5 py-2 ring-1 ring-inset backdrop-blur">
            <span className="text-muted-foreground mr-1 self-center text-[10px] font-semibold tracking-[0.08em] uppercase">
              {t("score")}
            </span>
            <span className="text-2xl font-extrabold tracking-tight">
              {article.reliabilityScore}
            </span>
            <span className="text-muted-foreground text-xs">/100</span>
          </span>
        )}
      </div>

      <div className="flex flex-col gap-3.5 p-8">
        <span className="text-primary inline-flex w-fit items-center gap-2 text-[11px] font-bold tracking-[0.08em] whitespace-nowrap uppercase">
          <span className="bg-primary size-2 shrink-0 rounded-full" />
          <span>
            {t("featured")}
            {tag ? ` · ${tag}` : ""}
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
