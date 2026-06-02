"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  saveRewrite,
  type ActionState,
} from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  articleId: string;
  locale: string;
  title: string;
  body: string;
};

export function RewriteForm({ articleId, locale, title, body }: Props) {
  const t = useTranslations("admin.review");
  const [, action, pending] = useActionState<ActionState, FormData>(
    saveRewrite,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="articleId" value={articleId} />
      <input type="hidden" name="locale" value={locale} />
      <div className="space-y-1.5">
        <label
          htmlFor={`rewrite-title-${locale}`}
          className="text-sm font-medium"
        >
          {t("rewrites.rewriteTitle")}
        </label>
        <Input
          id={`rewrite-title-${locale}`}
          name="title"
          defaultValue={title}
          required
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`rewrite-body-${locale}`}
          className="text-sm font-medium"
        >
          {t("rewrites.rewriteBody")}
        </label>
        <Textarea
          id={`rewrite-body-${locale}`}
          name="body"
          defaultValue={body}
          rows={16}
          required
          className="font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">{t("rewrites.hint")}</p>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
