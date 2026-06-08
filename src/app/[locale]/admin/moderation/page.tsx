import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ModerationList } from "@/components/admin/moderation-list";
import { loadModerationQueue } from "@/lib/contributions/queries";
import { requireAdminSession } from "@/lib/session";

const TAB_BASE =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors";
const TAB_ACTIVE = "bg-primary text-primary-foreground";
const TAB_INACTIVE = "text-muted-foreground hover:bg-accent";

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireAdminSession();
  const { filter } = await searchParams;
  const showRejected = filter === "rejected";
  const t = await getTranslations("admin.moderation");
  const items = await loadModerationQueue(showRejected ? "rejected" : "pending");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/moderation"
          className={`${TAB_BASE} ${showRejected ? TAB_INACTIVE : TAB_ACTIVE}`}
        >
          {t("pendingTab")}
        </Link>
        <Link
          href="/admin/moderation?filter=rejected"
          className={`${TAB_BASE} ${showRejected ? TAB_ACTIVE : TAB_INACTIVE}`}
        >
          {t("rejectedTab")}
        </Link>
      </div>

      <ModerationList items={items} showActions={!showRejected} />
    </div>
  );
}
