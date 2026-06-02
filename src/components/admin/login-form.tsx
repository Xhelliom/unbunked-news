"use client";

import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { useTheme } from "@/components/theme-provider";
import { authClient } from "@/lib/auth-client";

function BrandLogotype({ onIndigo = false }: { onIndigo?: boolean }) {
  return (
    <span className="inline-flex flex-col gap-[0.12em]">
      <span
        className={`font-serif text-[25px] leading-none font-bold tracking-[-0.015em] ${onIndigo ? "text-white" : "text-foreground"}`}
      >
        <span className={onIndigo ? "text-white" : "text-primary dark:text-indigo-300"}>
          Un
        </span>
        bunked
      </span>
      <span className="flex h-[0.095em] gap-[0.08em]" aria-hidden>
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-reliable)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-nuanced)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-biased)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-debunked)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-unverifiable)]" />
      </span>
    </span>
  );
}

type LoginFormProps = {
  weeklyVerifiedCount: number;
};

export function LoginForm({ weeklyVerifiedCount }: LoginFormProps) {
  const t = useTranslations("auth");
  const format = useFormatter();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const isDark = resolvedTheme === "dark";

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
    <div className="relative min-h-screen">
      {/* Bouton de bascule rapide clair/sombre dédié à la page login. */}
      <button
        type="button"
        aria-label={t("toggleTheme")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="fixed top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-md border border-border bg-background/70 text-foreground backdrop-blur transition-colors duration-150 hover:bg-accent"
      >
        {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </button>

      <div className="flex min-h-screen flex-col md:flex-row">
        {/* Panneau de marque inspiré du handoff: message éditorial + signature visuelle. */}
        <aside className="relative flex min-h-[260px] flex-1 flex-col justify-between overflow-hidden bg-primary p-8 text-white md:min-h-screen md:basis-[46%] md:p-12">
          <div className="absolute right-[-3rem] bottom-[-4rem] select-none font-serif text-[12rem] leading-none font-extrabold text-white/10 md:text-[22rem]">
            Un
          </div>

          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-[0.23em] bg-white font-serif text-xl font-bold tracking-[-0.02em] text-primary">
              Un
            </span>
            <BrandLogotype onIndigo />
          </div>

          <div className="relative z-10 max-w-[30ch]">
            <p className="mb-5 text-xs font-semibold tracking-[0.08em] uppercase text-white/75">
              {t("editorialConsole")}
            </p>
            <h1 className="mb-4 font-serif text-4xl leading-[1.08] font-extrabold tracking-[-0.015em] text-balance">
              {t("heroTitle")}
            </h1>
            <p className="text-[1.0625rem] leading-[1.55] text-white/85 text-pretty">
              {t("heroSubtitle")}
            </p>
          </div>

          <div className="relative z-10 flex flex-col gap-5">
            {/* Compteur alimenté côté serveur (articles publiés sur 7 jours). */}
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-4xl leading-none font-extrabold">
                {format.number(weeklyVerifiedCount)}
              </span>
              <span className="text-sm text-white/80">{t("weeklyChecks")}</span>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-white/65">
                {t("fiveVerdicts")}
              </span>
              <div className="flex gap-[7px]">
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-reliable)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-nuanced)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-biased)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-debunked)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-unverifiable)]" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 md:basis-[54%] md:px-12">
          <form onSubmit={onSubmit} className="w-full max-w-[380px]">
            <div className="mb-8">
              <div className="mb-6">
                <span className="inline-flex flex-col gap-[0.12em]">
                  <span className="font-serif text-[22px] leading-none font-bold tracking-[-0.015em] text-foreground">
                    <span className="text-primary dark:text-indigo-300">Un</span>bunked
                  </span>
                  <span className="flex h-[0.095em] gap-[0.08em]" aria-hidden>
                    <i className="h-full flex-1 rounded-full bg-[var(--verdict-reliable)]" />
                    <i className="h-full flex-1 rounded-full bg-[var(--verdict-nuanced)]" />
                    <i className="h-full flex-1 rounded-full bg-[var(--verdict-biased)]" />
                    <i className="h-full flex-1 rounded-full bg-[var(--verdict-debunked)]" />
                    <i className="h-full flex-1 rounded-full bg-[var(--verdict-unverifiable)]" />
                  </span>
                </span>
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
                className="h-11 w-full rounded-md border border-input bg-background px-[13px] text-[0.95rem] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_45%,transparent)]"
              />
            </div>

            <div className="mb-4">
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="password" className="text-[0.8125rem] font-medium">
                  {t("password")}
                </label>
                <button
                  type="button"
                  className="text-[0.78rem] font-medium text-primary hover:underline"
                >
                  {t("forgot")}
                </button>
              </div>
              <div className="relative">
                {/* Affiche/masque le mot de passe sans recharger la page. */}
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="h-11 w-full rounded-md border border-input bg-background px-[13px] pr-11 text-[0.95rem] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_45%,transparent)]"
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
              {/* Checkbox custom pour rester fidèle au design system fourni. */}
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

            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-input bg-background text-sm font-medium text-foreground shadow-xs transition-colors duration-150 hover:bg-accent"
            >
              <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M22.5 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2-1.9 3.3-4.7 3.3-8Z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.8A11 11 0 0 0 12 23Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2a11 11 0 0 0 0 9.8l3.7-2.8Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2 7.1l3.7 2.8C6.6 7.3 9.1 5.4 12 5.4Z"
                />
              </svg>
              {t("continueWithGoogle")}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
