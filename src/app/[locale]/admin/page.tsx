import { isNotNull, isNull } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { articles } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";

const TRASH_VIEW = "trash";

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const t = await getTranslations("admin.dashboard");
  const { view } = await searchParams;
  const showTrash = view === TRASH_VIEW;

  const items = await db.query.articles.findMany({
    where: showTrash
      ? isNotNull(articles.deletedAt)
      : isNull(articles.deletedAt),
    orderBy: (article, { desc }) => [
      desc(showTrash ? article.deletedAt : article.createdAt),
    ],
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {showTrash ? t("trashTitle") : t("title")}
        </h1>
        <Button asChild variant="outline" size="sm">
          <Link href={showTrash ? "/admin" : `/admin?view=${TRASH_VIEW}`}>
            {showTrash ? t("backToActive") : t("trash")}
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {showTrash ? t("trashEmpty") : t("empty")}
        </p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {items.map((article) => (
            <li key={article.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{article.title}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {article.sourceName}
                </p>
              </div>
              {article.verdict && <VerdictBadge verdict={article.verdict} />}
              {showTrash ? (
                <Badge variant="destructive">{t("deleted")}</Badge>
              ) : (
                <Badge variant={article.published ? "default" : "secondary"}>
                  {article.published ? t("published") : t("draft")}
                </Badge>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/articles/${article.id}`}>
                  {t("review")}
                </Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
