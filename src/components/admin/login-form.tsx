"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setPending(true);
    const data = new FormData(event.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    setPending(false);
    if (signInError) {
      setError(true);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-lg space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          {t("email")}
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          {t("password")}
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>
      {error && <p className="text-destructive text-sm">{t("error")}</p>}
      <Button type="submit" className="mt-2 h-11 w-full" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
