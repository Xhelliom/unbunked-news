import { getFormatter, getTranslations } from "next-intl/server";

import { restoreSnapshot } from "@/app/[locale]/admin/actions";
import type { ArticleSnapshotData } from "@/lib/article-snapshot";
import { toVerdict } from "@/lib/verdicts";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verdict-badge";

type SnapshotRow = {
  id: string;
  createdAt: Date;
  data: ArticleSnapshotData;
};

// Lists the versions captured before each in-place re-analysis (or restore),
// most recent first, and lets an admin roll the article back to any of them.
export async function ArticleSnapshots({
  snapshots,
}: {
  snapshots: SnapshotRow[];
}) {
  const t = await getTranslations("admin.review.snapshots");
  const format = await getFormatter();

  if (snapshots.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="font-serif text-lg font-bold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-lg font-bold">{t("title")}</h2>
      <p className="text-muted-foreground text-sm">{t("hint")}</p>
      <ul className="space-y-3">
        {snapshots.map((snapshot) => {
          const verdict = toVerdict(snapshot.data.verdict);
          return (
            <li
              key={snapshot.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-4"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  {verdict && <VerdictBadge verdict={verdict} />}
                  <span className="text-sm font-medium">
                    {snapshot.data.reliabilityScore ?? "—"}
                    <span className="text-muted-foreground">/100</span>
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {t("claimsCount", { count: snapshot.data.claims.length })}
                  </span>
                </div>
                <p className="truncate text-sm">{snapshot.data.title}</p>
                <p className="text-muted-foreground text-xs">
                  {t("archivedOn")}{" "}
                  {format.dateTime(snapshot.createdAt, {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <form action={restoreSnapshot}>
                <input type="hidden" name="snapshotId" value={snapshot.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t("restore")}
                </Button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
