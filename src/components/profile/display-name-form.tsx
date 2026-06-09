"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Status = "idle" | "saving" | "saved" | "error";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const t = useTranslations("profile.displayName");
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const { error } = await authClient.updateUser({ name });
    if (error) {
      setStatus("error");
      return;
    }
    setStatus("saved");
    // The pseudonym is shown on the user's public contributions and in the menu.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          {t("label")}
        </label>
        <Input id="name" name="name" type="text" required defaultValue={initialName} />
        <p className="text-muted-foreground text-xs">{t("hint")}</p>
      </div>

      {status === "error" && (
        <p className="text-destructive text-sm">{t("error")}</p>
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
