"use client";

import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import {
  AUTH_INPUT_CLASS,
  AuthShell,
  BrandLogotype,
} from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";

type LoginFormProps = {
  weeklyVerifiedCount: number;
};

export function LoginForm({ weeklyVerifiedCount }: LoginFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setPending(true);
    const data = new FormData(event.currentTarget);
    const { error: signInError } = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      rememberMe: remember,
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
    <AuthShell weeklyVerifiedCount={weeklyVerifiedCount}>
      <form onSubmit={onSubmit} className="w-full max-w-[380px]">
        <div className="mb-8">
          <div className="mb-6">
            <BrandLogotype />
          </div>
          <h2 className="mb-2 font-serif text-[1.85rem] leading-[1.12] font-extrabold tracking-[-0.015em] text-balance">
            {t("loginTitle")}
          </h2>
          <p className="text-base leading-[1.5] text-muted-foreground text-pretty">
            {t("loginSubtitle")}
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-[0.8125rem] font-medium">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t("emailPlaceholder")}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <label htmlFor="password" className="text-[0.8125rem] font-medium">
              {t("password")}
            </label>
            <Link
              href="/forgot-password"
              className="text-[0.78rem] font-medium text-primary hover:underline"
            >
              {t("forgot")}
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${AUTH_INPUT_CLASS} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
              className="absolute top-1/2 right-1 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        <label className="mb-6 flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
            className="peer sr-only"
          />
          <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] border border-input bg-background transition-all duration-150 peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_45%,transparent)]">
            <Check className="size-3 text-primary-foreground opacity-0 transition-opacity duration-150 peer-checked:opacity-100" />
          </span>
          <span className="text-sm text-foreground">{t("rememberMe")}</span>
        </label>

        {error && <p className="mb-4 text-sm text-destructive">{t("error")}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mb-6 flex h-[46px] w-full items-center justify-center gap-2 rounded-md bg-primary text-[0.95rem] font-semibold text-primary-foreground shadow-xs transition-colors duration-150 hover:bg-[color-mix(in_oklab,var(--primary)_90%,black)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? t("signingIn") : t("signIn")}
          <ArrowRight className="size-[17px]" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t("or")}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton label={t("continueWithGoogle")} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("signUpLink")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
