import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { setMemberAdminStatus } from "@/app/[locale]/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminMembersPage() {
  const t = await getTranslations("admin.members");
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
