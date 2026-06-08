"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  submitContribution,
  type SubmitContributionState,
} from "@/app/[locale]/(public)/article/[slug]/actions";
import { CONTRIBUTION_BODY_MAX_CHARS } from "@/lib/contributions/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TurnstileWidget } from "@/components/article-reader/turnstile-widget";

export type ClaimTarget = { id: string; label: string };

const SELECT_CLASS =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

export function ContributionForm({
  articleId,
  claimTargets,
}: {
  articleId: string;
  claimTargets: ClaimTarget[];
}) {
  const t = useTranslations("contributions");
  const [state, action, pending] = useActionState<
    SubmitContributionState,
    FormData
  >(submitContribution, { status: "idle" });

  if (state.status === "success") {
    return (
      <p className="border-primary/30 bg-primary/5 text-foreground rounded-md border px-3 py-2 text-sm">
        {t("successPending")}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="articleId" value={articleId} />

      {claimTargets.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="claimId" className="text-sm font-medium">
            {t("targetLabel")}
          </label>
          <select
            id="claimId"
            name="claimId"
            defaultValue=""
            className={SELECT_CLASS}
          >
            <option value="">{t("targetArticle")}</option>
            {claimTargets.map((target) => (
              <option key={target.id} value={target.id}>
                {target.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <Textarea
        name="body"
        required
        rows={4}
        maxLength={CONTRIBUTION_BODY_MAX_CHARS}
        placeholder={t("bodyPlaceholder")}
      />

      <Input name="sourceUrl" type="url" placeholder={t("sourceUrlPlaceholder")} />

      <TurnstileWidget />

      {state.status === "error" && (
        <p className="text-destructive text-sm">{t(`errors.${state.code}`)}</p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
