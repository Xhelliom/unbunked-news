import { useTranslations } from "next-intl";

import type { getPublishedArticles } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { ArticleImage } from "@/components/article-image";
import { FeedImageOverlay } from "@/components/feed-image-overlay";

type FeedArticle = Awaited<ReturnType<typeof getPublishedArticles>>[number];

export function ArticleCard({ article }: { article: FeedArticle }) {
  const tr = useTranslations("rubrics");
  const rubric = article.rubric ? tr(`${article.rubric}.label`) : undefined;
  const eyebrow = [article.sourceName, rubric].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/article/${article.slug}`}
      className="group bg-card flex flex-col overflow-hidden rounded-xl border transition-shadow hover:shadow-sm"
    >
      <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden">
        <ArticleImage
          src={article.imageUrl}
          verdict={article.verdict}
          label={article.sourceName}
        />
        <FeedImageOverlay
          verdict={article.verdict}
          score={article.reliabilityScore}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
        <p className="text-muted-foreground text-xs font-semibold tracking-[0.05em] uppercase">
          {eyebrow}
        </p>
        <h3 className="group-hover:text-primary font-serif text-lg leading-[1.25] font-bold text-balance transition-colors">
          {article.title}
        </h3>
        {article.summary && (
          <p className="text-muted-foreground line-clamp-2 text-[13.5px] leading-[1.5]">
            {article.summary}
          </p>
        )}
      </div>
    </Link>
  );
}
