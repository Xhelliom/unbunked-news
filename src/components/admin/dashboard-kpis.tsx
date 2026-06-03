import { getFormatter, getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import type { EditorialKpis } from "@/lib/admin/dashboard-queries";
import { KPI_WINDOW_DAYS } from "@/lib/admin/dashboard-queries";
import { cn } from "@/lib/utils";

export async function DashboardKpis({ kpis }: { kpis: EditorialKpis }) {
  const t = await getTranslations("admin.dashboard.kpis");
  const format = await getFormatter();

  const cards = [
    { label: t("published"), value: format.number(kpis.published) },
    { label: t("drafts"), value: format.number(kpis.drafts) },
    {
      label: t("avgScore"),
      value: kpis.avgScore === null ? "—" : `${Math.round(kpis.avgScore)}/100`,
    },
    {
      label: t("needsReview"),
      value: format.number(kpis.needsReview),
      alert: kpis.needsReview > 0,
    },
    {
      label: t("publishedRecently", { days: KPI_WINDOW_DAYS }),
      value: format.number(kpis.publishedRecently),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="space-y-1.5">
            <p className="text-muted-foreground text-sm">{card.label}</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                card.alert && "text-verdict-debunked",
              )}
            >
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
