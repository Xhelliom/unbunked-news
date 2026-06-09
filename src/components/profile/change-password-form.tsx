"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MIN_PASSWORD_LENGTH = 8;

type Status = "idle" | "saving" | "saved" | "error";

export function ChangePasswordForm() {
  const t = useTranslations("profile.password");
  const [status, setStatus] = useState<Status>("idle");
  const [errorKey, setErrorKey] = useState<"weak" | "mismatch" | "wrong" | "generic">(
    "generic",
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirm") ?? "");

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setErrorKey("weak");
      setStatus("error");
      return;
    }
    if (newPassword !== confirm) {
      setErrorKey("mismatch");
      setStatus("error");
      return;
    }

    setStatus("saving");
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (error) {
      // A 400/401 here is almost always a wrong current password.
      setErrorKey(error.status === 400 || error.status === 401 ? "wrong" : "generic");
      setStatus("error");
      return;
    }
    form.reset();
    setStatus("saved");
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="currentPassword" className="text-sm font-medium">
          {t("current")}
        </label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-sm font-medium">
          {t("new")}
        </label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirm" className="text-sm font-medium">
          {t("confirm")}
        </label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
        />
      </div>

      {status === "error" && (
        <p className="text-destructive text-sm">{t(`errors.${errorKey}`)}</p>
      )}
      {status === "saved" && (
        <p className="text-sm text-[var(--verdict-reliable)]">{t("saved")}</p>
      )}

      <Button type="submit" disabled={status === "saving"}>
        {status === "saving" ? t("saving") : t("submit")}
      </Button>
    </form>
  );
}
