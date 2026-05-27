"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  proposeArticle,
  type ProposeState,
} from "@/app/[locale]/(public)/submit/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProposeForm() {
  const t = useTranslations("propose");
  const [state, action, pending] = useActionState<ProposeState, FormData>(
    proposeArticle,
    {},
  );

  if (state.ok) {
    return (
      <p className="text-verdict-reliable-fg bg-verdict-reliable-bg rounded-md px-4 py-3 text-sm">
        {t("success")}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          {t("urlLabel")}
        </label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          placeholder={t("urlPlaceholder")}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("emailLabel")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder={t("emailPlaceholder")}
        />
      </div>
      {state.error && (
        <p className="text-destructive text-sm">{t("invalidUrl")}</p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
