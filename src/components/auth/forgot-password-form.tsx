"use client";

import { useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { AUTH_INPUT_CLASS, AuthShell, BrandLogotype } from "@/components/auth/auth-shell";

export function ForgotPasswordForm() {
  const t = useTranslations("auth.forgotPassword");
  const ta = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    // Don't branch on the result: always show the same confirmation so the form
    // never reveals whether an email is registered.
    await authClient.requestPasswordReset({
      email: String(data.get("email") ?? "").trim(),
      redirectTo: "/reset-password",
    });
    setPending(false);
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell>
        <div className="w-full max-w-[380px] text-center">
          <MailCheck className="text-primary mx-auto mb-4 size-10" />
          <h2 className="mb-2 font-serif text-[1.6rem] font-extrabold tracking-[-0.015em]">
            {t("sentTitle")}
          </h2>
          <p className="text-muted-foreground mb-6 text-base leading-[1.5]">
            {t("sent")}
          </p>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={onSubmit} className="w-full max-w-[380px]">
        <div className="mb-8">
          <div className="mb-6">
            <BrandLogotype />
          </div>
          <h2 className="mb-2 font-serif text-[1.85rem] leading-[1.12] font-extrabold tracking-[-0.015em] text-balance">
            {t("title")}
          </h2>
          <p className="text-base leading-[1.5] text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="email" className="mb-1.5 block text-[0.8125rem] font-medium">
            {ta("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={ta("emailPlaceholder")}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mb-6 flex h-[46px] w-full items-center justify-center gap-2 rounded-md bg-primary text-[0.95rem] font-semibold text-primary-foreground shadow-xs transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--primary)_90%,black)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? t("submitting") : t("submit")}
          <ArrowRight className="size-[17px]" />
        </button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("backToLogin")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
