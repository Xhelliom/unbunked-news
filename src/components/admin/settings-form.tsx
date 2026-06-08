"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import {
  updateAppSettings,
  type SettingsActionState,
} from "@/app/[locale]/admin/settings/actions";
import { Button } from "@/components/ui/button";

type SettingsFormProps = {
  publicSignupEnabled: boolean;
  aiModerationEnabled: boolean;
};

export function SettingsForm(props: SettingsFormProps) {
  const t = useTranslations("admin.settings");
  const [state, action, pending] = useActionState<
    SettingsActionState,
    FormData
  >(updateAppSettings, { status: "idle" });

  return (
    <form action={action} className="space-y-6">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="publicSignupEnabled"
          defaultChecked={props.publicSignupEnabled}
          className="mt-1"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">
            {t("publicSignup.label")}
          </span>
          <span className="text-muted-foreground block text-sm">
            {t("publicSignup.hint")}
          </span>
        </span>
      </label>

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="aiModerationEnabled"
          defaultChecked={props.aiModerationEnabled}
          className="mt-1"
        />
        <span className="space-y-0.5">
          <span className="block text-sm font-medium">
            {t("aiModeration.label")}
          </span>
          <span className="text-muted-foreground block text-sm">
            {t("aiModeration.hint")}
          </span>
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {state.status === "saved" && (
          <span className="text-muted-foreground text-sm">{t("saved")}</span>
        )}
      </div>
    </form>
  );
}
