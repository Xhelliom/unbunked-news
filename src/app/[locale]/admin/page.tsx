import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DashboardFilters } from "@/components/admin/dashboard-filters";
import { DashboardKpis } from "@/components/admin/dashboard-kpis";
import { DashboardTable } from "@/components/admin/dashboard-table";
import { PublishingHeatmap } from "@/components/admin/publishing-heatmap";
import {
  parseFlagFilter,
  parseSort,
  parseStatusFilter,
  parseVerdictFilter,
  TRASH_VIEW,
} from "@/lib/admin/dashboard-params";
import {
  ACTIVITY_DAYS,
  loadDashboardArticles,
  loadEditorialKpis,
  loadPublishingActivity,
} from "@/lib/admin/dashboard-queries";

type SearchParams = {
  view?: string;
  sort?: string;
  verdict?: string;
  status?: string;
  flag?: string;
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const t = await getTranslations("admin.dashboard");
  const params = await searchParams;
  const showTrash = params.view === TRASH_VIEW;

  const sort = parseSort(params.sort);
  const verdict = parseVerdictFilter(params.verdict);
  const status = parseStatusFilter(params.status);
  const flagReview = parseFlagFilter(params.flag);

  const [articles, kpis, activity] = await Promise.all([
    loadDashboardArticles({ view: params.view, sort, verdict, status, flagReview }),
    showTrash ? null : loadEditorialKpis(),
    showTrash ? null : loadPublishingActivity(ACTIVITY_DAYS),
  ]);

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

      {kpis && <DashboardKpis kpis={kpis} />}

      {activity && activity.length > 0 && (
        <PublishingHeatmap data={activity} />
      )}

      {!showTrash && (
        <DashboardFilters
          sort={sort}
          verdict={verdict}
          status={status}
          flagReview={flagReview}
          showTrash={showTrash}
        />
      )}

      {articles.length === 0 ? (
        <p className="text-muted-foreground">
          {showTrash ? t("trashEmpty") : t("empty")}
        </p>
      ) : (
        <div className="rounded-lg border">
          <DashboardTable articles={articles} showTrash={showTrash} />
        </div>
      )}
    </div>
  );
}
