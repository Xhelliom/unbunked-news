import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { setMemberAdminStatus } from "@/app/[locale]/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AdminMembersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MEMBER_ERROR_KEYS = {
  missingMemberId: "errors.missingMemberId",
  cannotDemoteSelf: "errors.cannotDemoteSelf",
  cannotDemoteLastAdmin: "errors.cannotDemoteLastAdmin",
} as const;

export default async function AdminMembersPage({
  searchParams,
}: AdminMembersPageProps) {
  const t = await getTranslations("admin.members");
  const resolvedSearchParams = await searchParams;
  const rawError = resolvedSearchParams.error;
  const errorMessage =
    typeof rawError === "string" && rawError in MEMBER_ERROR_KEYS
      ? t(MEMBER_ERROR_KEYS[rawError as keyof typeof MEMBER_ERROR_KEYS])
      : null;
  const members = await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: (member, { desc }) => [desc(member.createdAt)],
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      {members.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-border divide-y rounded-lg border">
          {members.map((member) => {
            const nextAdminValue = member.isAdmin ? "false" : "true";
            const actionLabel = member.isAdmin ? t("demote") : t("promote");
            return (
              <li key={member.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{member.name}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {member.email}
                  </p>
                </div>
                <Badge variant={member.isAdmin ? "default" : "secondary"}>
                  {member.isAdmin ? t("admin") : t("member")}
                </Badge>
                <form action={setMemberAdminStatus}>
                  <input type="hidden" name="id" value={member.id} />
                  <input type="hidden" name="isAdmin" value={nextAdminValue} />
                  {/* Action simple: toggle du statut admin du membre ciblé. */}
                  <Button type="submit" size="sm" variant="outline">
                    {actionLabel}
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
