"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, MailCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { AUTH_INPUT_CLASS, AuthShell } from "@/components/auth/auth-shell";
import { GoogleButton } from "@/components/auth/google-button";
import { Logo } from "@/components/logo";

const MIN_PASSWORD_LENGTH = 8;

export function SignupForm() {
  const t = useTranslations("auth.signup");
  const ta = useTranslations("auth");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const name = String(data.get("name") ?? "").trim();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("errors.weakPassword"));
      return;
    }
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({
      email,
      password,
      name,
      callbackURL: "/",
    });
    setPending(false);
    if (signUpError) {
      // The sign-up gate throws BAD_REQUEST when public sign-up is off; everything
      // else (duplicate email, weak password) also surfaces here.
      setError(
        signUpError.status === 403 || signUpError.status === 400
          ? t("errors.disabledOrInvalid")
          : t("errors.generic"),
      );
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthShell>
        <div className="w-full max-w-[380px] text-center">
          <MailCheck className="text-primary mx-auto mb-4 size-10" />
          <h2 className="mb-2 font-serif text-[1.6rem] font-extrabold tracking-[-0.015em]">
            {t("verifyTitle")}
          </h2>
          <p className="text-muted-foreground mb-6 text-base leading-[1.5]">
            {t("verifySent", { email: sentTo })}
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
            <Logo className="text-[25px]" />
          </div>
          <h2 className="mb-2 font-serif text-[1.85rem] leading-[1.12] font-extrabold tracking-[-0.015em] text-balance">
            {t("title")}
          </h2>
          <p className="text-base leading-[1.5] text-muted-foreground text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="name" className="mb-1.5 block text-[0.8125rem] font-medium">
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className={AUTH_INPUT_CLASS}
          />
        </div>

        <div className="mb-4">
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

        <div className="mb-6">
          <label htmlFor="password" className="mb-1.5 block text-[0.8125rem] font-medium">
            {ta("password")}
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
          <p className="text-muted-foreground mt-1.5 text-xs">{t("passwordHint")}</p>
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

        <div className="mb-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{ta("or")}</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <GoogleButton label={ta("continueWithGoogle")} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("loginLink")}
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
