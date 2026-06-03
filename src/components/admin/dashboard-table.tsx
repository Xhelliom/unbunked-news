"use client";

import { AlertTriangle } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { ClaimDistribution } from "@/components/admin/claim-distribution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictBadge } from "@/components/verdict-badge";
import {
  attentionReasons,
  type DashboardArticle,
} from "@/lib/admin/dashboard-params";
import { Link } from "@/i18n/navigation";

type DashboardTableProps = {
  articles: DashboardArticle[];
  showTrash: boolean;
};

export function DashboardTable({ articles, showTrash }: DashboardTableProps) {
  const t = useTranslations("admin.dashboard");
  const format = useFormatter();

  const formatDate = (date: Date) =>
    format.dateTime(date, { day: "numeric", month: "short", year: "numeric" });
  const formatPercent = (value: number) =>
    format.number(value, { style: "percent", maximumFractionDigits: 0 });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("columns.article")}</TableHead>
          <TableHead>{t("columns.date")}</TableHead>
          <TableHead>{t("columns.verdict")}</TableHead>
          <TableHead className="text-right">{t("columns.views")}</TableHead>
          <TableHead className="text-right">{t("columns.readRate")}</TableHead>
          <TableHead>{t("columns.claims")}</TableHead>
          <TableHead>{t("columns.status")}</TableHead>
          <TableHead className="sr-only">{t("columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {articles.map((article) => {
          const date = showTrash
            ? article.deletedAt
            : (article.publishedAt ?? article.createdAt);
          const reasons = showTrash ? [] : attentionReasons(article);
          const readRate =
            article.views > 0 ? article.reads / article.views : null;

          return (
            <TableRow key={article.id}>
              <TableCell className="max-w-xs">
                <p className="truncate font-medium">{article.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {article.sourceName} · {article.locale.toUpperCase()}
                </p>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {date ? formatDate(date) : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {article.verdict && (
                    <VerdictBadge verdict={article.verdict} />
                  )}
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {article.reliabilityScore === null
                      ? "—"
                      : `${article.reliabilityScore}/100`}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="font-medium">
                  {format.number(article.views)}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {t("recentViews", { count: article.recentViews })}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {readRate === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  formatPercent(readRate)
                )}
              </TableCell>
              <TableCell>
                <ClaimDistribution
                  claims={article.claims}
                  label={t("claimsCount", { count: article.claims.total })}
                />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  {showTrash ? (
                    <Badge variant="destructive">{t("deleted")}</Badge>
                  ) : (
                    <Badge
                      variant={article.published ? "default" : "secondary"}
                    >
                      {article.published ? t("published") : t("draft")}
                    </Badge>
                  )}
                  {reasons.length > 0 && (
                    <span
                      className="text-verdict-fragile inline-flex items-center gap-1 text-xs font-medium"
                      title={reasons
                        .map((reason) => t(`attention.${reason}`))
                        .join(" · ")}
                    >
                      <AlertTriangle className="size-3.5" aria-hidden />
                      {t(`attention.${reasons[0]}`)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/articles/${article.id}`}>
                    {t("review")}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
