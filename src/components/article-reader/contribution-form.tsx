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

type ContributionFormProps = {
  articleId: string;
  // null → about the whole article; a claim id → about that specific claim.
  claimId?: string | null;
  // Compact layout + a Cancel action, for the inline per-claim form.
  compact?: boolean;
  onCancel?: () => void;
};

export function ContributionForm({
  articleId,
  claimId = null,
  compact = false,
  onCancel,
}: ContributionFormProps) {
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
      <input type="hidden" name="claimId" value={claimId ?? ""} />

      <Textarea
        name="body"
        required
        rows={compact ? 3 : 4}
        maxLength={CONTRIBUTION_BODY_MAX_CHARS}
        placeholder={t("bodyPlaceholder")}
      />

      <Input name="sourceUrl" type="url" placeholder={t("sourceUrlPlaceholder")} />

      <TurnstileWidget />

      {state.status === "error" && (
        <p className="text-destructive text-sm">{t(`errors.${state.code}`)}</p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" size={compact ? "sm" : "default"} disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  );
}
