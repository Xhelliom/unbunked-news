"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { submitUrl, type ActionState } from "@/app/[locale]/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_REASONING_MODEL,
  REASONING_MODEL_LABEL_KEY,
  SELECTABLE_REASONING_MODELS,
} from "@/lib/pipeline/models";

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
      <div className="space-y-1.5">
        <label htmlFor="model" className="text-sm font-medium">
          {t("modelLabel")}
        </label>
        <select
          id="model"
          name="model"
          defaultValue={DEFAULT_REASONING_MODEL}
          className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {SELECTABLE_REASONING_MODELS.map((model) => (
            <option key={model} value={model}>
              {t(`models.${REASONING_MODEL_LABEL_KEY[model]}`)}
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">{t("modelHint")}</p>
      </div>
      {state.error && <p className="text-destructive text-sm">{t("invalidUrl")}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? t("starting") : t("start")}
      </Button>
    </form>
  );
}
