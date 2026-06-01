import { getFormatter, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { loadTokenUsageSummary } from "@/lib/pipeline/usage-queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const USD = "USD";

export default async function AdminCosts() {
  const t = await getTranslations("admin.costs");
  const format = await getFormatter();
  const summary = await loadTokenUsageSummary();

  const formatNumber = (value: number) => format.number(value);
  const formatCost = (value: number) =>
    format.number(value, {
      style: "currency",
      currency: USD,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  const formatDay = (date: Date) =>
    format.dateTime(date, { day: "numeric", month: "short", year: "numeric" });

  const kpis: {
    key: "totalCost" | "totalTokens" | "articles" | "avgCost";
    value: string;
  }[] = [
    { key: "totalCost", value: formatCost(summary.totalCostUsd) },
    { key: "totalTokens", value: formatNumber(summary.totalTokens) },
    { key: "articles", value: formatNumber(summary.articleCount) },
    { key: "avgCost", value: formatCost(summary.avgCostUsd) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.key}>
            <CardContent className="space-y-1.5">
              <p className="text-muted-foreground text-sm">{t(kpi.key)}</p>
              <p className="text-3xl font-bold tabular-nums">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("table.title")}</CardTitle>
          {summary.articleCount > summary.rows.length && (
            <CardDescription>
              {t("table.truncated", { count: summary.rows.length })}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {summary.rows.length === 0 ? (
            <p className="text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-left">
                    <th className="py-2 pr-4 font-medium">
                      {t("table.article")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium tabular-nums">
                      {t("table.input")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium tabular-nums">
                      {t("table.output")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium tabular-nums">
                      {t("table.cache")}
                    </th>
                    <th className="py-2 pr-4 text-right font-medium tabular-nums">
                      {t("table.total")}
                    </th>
                    <th className="py-2 text-right font-medium tabular-nums">
                      {t("table.cost")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {summary.rows.map((row) => (
                    <tr key={row.articleId}>
                      <td className="max-w-xs py-2 pr-4">
                        <Link
                          href={`/admin/articles/${row.articleId}`}
                          className="hover:text-primary block truncate font-medium"
                        >
                          {row.title}
                        </Link>
                        <span className="text-muted-foreground text-xs">
                          {row.sourceName} · {formatDay(row.createdAt)}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(row.inputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(row.outputTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatNumber(row.cacheTokens)}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium tabular-nums">
                        {formatNumber(row.totalTokens)}
                      </td>
                      <td className="py-2 text-right font-medium tabular-nums">
                        {formatCost(row.costUsd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-xs">{t("note")}</p>
    </div>
  );
}
