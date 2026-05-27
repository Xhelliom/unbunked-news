"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { submitUrl, type ActionState } from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SubmitForm() {
  const t = useTranslations("admin.submit");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitUrl,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="url" className="text-sm font-medium">
          {t("urlLabel")}
        </label>
        <Input
          id="url"
          name="url"
          type="url"
          placeholder={t("urlPlaceholder")}
          required
        />
      </div>
      {state.error && <p className="text-destructive text-sm">{t("invalidUrl")}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}
