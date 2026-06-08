"use client";

import { useTranslations } from "next-intl";

import {
  approveContribution,
  rejectContribution,
} from "@/app/[locale]/admin/moderation/actions";
import type { AiModerationVerdict } from "@/lib/contributions/constants";
import type { ModerationItem } from "@/lib/contributions/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VERDICT_VARIANT: Record<
  AiModerationVerdict,
  "secondary" | "outline" | "destructive"
> = {
  clean: "secondary",
  suspicious: "outline",
  spam: "destructive",
};

type ModerationListProps = {
  items: ModerationItem[];
  // Which queue is shown. Pending items can be approved or rejected; rejected
  // items keep an Approve action so a false-positive (incl. AI auto-reject) can
  // be recovered — they're never a dead end.
  variant: "pending" | "rejected";
};

export function ModerationList({ items, variant }: ModerationListProps) {
  const t = useTranslations("admin.moderation");

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("emptyQueue")}</p>;
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id} className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">
              {item.claimPosition === null
                ? t("target.article")
                : t("target.claim", { n: item.claimPosition + 1 })}
            </Badge>
            {item.aiVerdict && (
              <Badge variant={VERDICT_VARIANT[item.aiVerdict]}>
                {t(`aiVerdict.${item.aiVerdict}`)}
              </Badge>
            )}
            <span className="text-muted-foreground">
              {t("byAuthor", { name: item.authorName })}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap">{item.body}</p>

          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary inline-block text-sm underline"
            >
              {t("sourceLink")}
            </a>
          )}

          {item.aiReason && (
            <p className="text-muted-foreground text-xs italic">
              {t("aiReasonLabel")}: {item.aiReason}
            </p>
          )}

          <p className="text-muted-foreground text-xs">
            <a
              href={`/article/${item.articleSlug}`}
              target="_blank"
              rel="noreferrer noopener"
              className="underline"
            >
              {item.articleTitle}
            </a>
          </p>

          <div className="flex flex-wrap gap-2">
            <form action={approveContribution}>
              <input type="hidden" name="id" value={item.id} />
              <Button type="submit" size="sm">
                {t("approve")}
              </Button>
            </form>
            {variant === "pending" && (
              <form action={rejectContribution}>
                <input type="hidden" name="id" value={item.id} />
                <Button type="submit" size="sm" variant="destructive">
                  {t("reject")}
                </Button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
