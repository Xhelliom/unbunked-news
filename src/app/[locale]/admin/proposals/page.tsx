import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acceptProposal, rejectProposal } from "@/app/[locale]/admin/actions";

export default async function AdminProposalsPage() {
  const t = await getTranslations("admin.proposals");
  const items = await db.query.proposals.findMany({
    orderBy: (proposal, { desc }) => [desc(proposal.createdAt)],
    limit: 100,
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
          {items.map((proposal) => (
            <li key={proposal.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{proposal.url}</p>
                {proposal.email && (
                  <p className="text-muted-foreground truncate text-sm">
                    {proposal.email}
                  </p>
                )}
              </div>
              <Badge
                variant={
                  proposal.status === "pending" ? "secondary" : "outline"
                }
              >
                {t(`statuses.${proposal.status}`)}
              </Badge>
              {proposal.status === "pending" && (
                <div className="flex gap-2">
                  <form action={acceptProposal}>
                    <input type="hidden" name="id" value={proposal.id} />
                    <Button type="submit" size="sm">
                      {t("accept")}
                    </Button>
                  </form>
                  <form action={rejectProposal}>
                    <input type="hidden" name="id" value={proposal.id} />
                    <Button type="submit" size="sm" variant="outline">
                      {t("reject")}
                    </Button>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
