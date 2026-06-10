import { Pencil } from "lucide-react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { loadArticleForPreview } from "@/lib/articles";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { ArticleView } from "@/components/article/article-view";

export default async function ArticlePreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const article = await loadArticleForPreview(id);
  if (!article) {
    notFound();
  }

  const t = await getTranslations("admin.preview");
  const { view } = await searchParams;

  return (
    <div className="min-h-screen">
      <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-300 dark:border-amber-500/40">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t("title")}</p>
            <p className="text-muted-foreground text-xs">{t("subtitle")}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto">
            <Link href={`/admin/articles/${id}`}>
              <Pencil className="size-3.5" />
              {t("back")}
            </Link>
          </Button>
        </div>
      </div>

      <ArticleView article={article} locale={locale} requestedView={view} isPreview />
    </div>
  );
}
