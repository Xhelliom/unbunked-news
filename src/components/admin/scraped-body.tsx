"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";

import type { ActionState } from "@/app/[locale]/admin/actions";
import { updateScrapedContent } from "@/app/[locale]/admin/articles/[id]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const SCRAPED_BODY_TEXTAREA_ROWS = 16;

// Collapsible dump of the raw scraped article body, with a manual-edit
// fallback for when the extractor leaves a stray word, ad, or menu label
// stuck to the text — cheaper than a full re-scrape.
export function ScrapedBody({
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

  const paragraphs = (content ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  return (
    <details className="rounded-lg border">
      <summary className="cursor-pointer p-4 text-sm font-semibold">
        {t("scrapedBody")}
        <span className="text-muted-foreground ml-2 font-normal">
          {t("scrapedBodyChars", { count: content?.length ?? 0 })}
        </span>
      </summary>
      <div className="space-y-3 border-t p-4">
        {editing ? (
          <form action={action} className="space-y-3">
            <input type="hidden" name="id" value={id} />
            <p className="text-muted-foreground text-xs">
              {t("scrapedBodyHint")}
            </p>
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
        ) : (
          <>
            {paragraphs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("scrapedBodyEmpty")}
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {paragraphs.map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
            >
              {t("scrapedBodyEdit")}
            </Button>
          </>
        )}
      </div>
    </details>
  );
}
