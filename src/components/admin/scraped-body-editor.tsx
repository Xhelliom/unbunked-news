"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import {
  updateScrapedContent,
  type ActionState,
} from "@/app/[locale]/admin/articles/[id]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SCRAPED_BODY_TEXTAREA_ROWS = 16;

// Manual-edit fallback for when the extractor leaves a stray word, ad, or
// menu label stuck to the scraped text — cheaper than a full re-scrape. Kept
// as its own client island so the read-only dump in ScrapedBody stays a
// server component.
export function ScrapedBodyEditor({
  id,
  content,
}: {
  id: string;
  content: string | null;
}) {
  const t = useTranslations("admin.review");
  const [editing, setEditing] = useState(false);
  const [, action, pending] = useActionState<ActionState, FormData>(
    updateScrapedContent,
    {},
  );

  if (!editing) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setEditing(true)}
      >
        {t("scrapedBodyEdit")}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-muted-foreground text-xs">{t("scrapedBodyHint")}</p>
      <Textarea
        name="content"
        defaultValue={content ?? ""}
        rows={SCRAPED_BODY_TEXTAREA_ROWS}
        className="font-mono text-sm"
      />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setEditing(false)}
        >
          {t("scrapedBodyCancel")}
        </Button>
      </div>
    </form>
  );
}
