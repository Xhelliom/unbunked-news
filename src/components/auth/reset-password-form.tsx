"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { AUTH_INPUT_CLASS, AuthShell, BrandLogotype } from "@/components/auth/auth-shell";

const MIN_PASSWORD_LENGTH = 8;

export function ResetPasswordForm({ token }: { token: string | null }) {
  const t = useTranslations("auth.resetPassword");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError(t("errors.invalidToken"));
      return;
    }
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") ?? "");
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("errors.weakPassword"));
      return;
    }
    if (password !== String(data.get("confirm") ?? "")) {
      setError(t("errors.mismatch"));
      return;
    }
    setPending(true);
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (resetError) {
      setError(t("errors.invalidToken"));
      return;
    }
    router.push("/login");
    router.refresh();
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

        {!token && (
          <p className="mb-4 text-sm text-destructive">{t("errors.invalidToken")}</p>
        )}

        <div className="mb-4">
          <label htmlFor="password" className="mb-1.5 block text-[0.8125rem] font-medium">
            {t("newPassword")}
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              placeholder="••••••••"
              className={`${AUTH_INPUT_CLASS} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? ta("hidePassword") : ta("showPassword")}
              className="absolute top-1/2 right-1 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="confirm" className="mb-1.5 block text-[0.8125rem] font-medium">
            {t("confirmPassword")}
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••"
            className={AUTH_INPUT_CLASS}
          />
        </div>

        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

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
