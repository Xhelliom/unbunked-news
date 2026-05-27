import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";

export default async function AdminDashboard() {
  const t = await getTranslations("admin.dashboard");
  const items = await db.query.articles.findMany({
    orderBy: (article, { desc }) => [desc(article.createdAt)],
    limit: 50,
  });

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl font-bold tracking-tight">
        {t("title")}
      </h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {items.map((article) => (
            <li
              key={article.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{article.title}</p>
                <p className="text-muted-foreground truncate text-sm">
                  {article.sourceName}
                </p>
              </div>
              {article.verdict && <VerdictBadge verdict={article.verdict} />}
              <Badge variant={article.published ? "default" : "secondary"}>
                {article.published ? t("published") : t("draft")}
              </Badge>
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
