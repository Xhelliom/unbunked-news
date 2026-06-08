"use client";

import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { useTheme } from "@/components/theme-provider";

// Shared text-input styling across every auth form (login, sign-up, reset…).
export const AUTH_INPUT_CLASS =
  "h-11 w-full rounded-md border border-input bg-background px-[13px] text-[0.95rem] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/70 focus:border-ring focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--ring)_45%,transparent)]";

export function BrandLogotype({ onIndigo = false }: { onIndigo?: boolean }) {
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
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-fragile)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-debunked)]" />
        <i className="h-full flex-1 rounded-full bg-[var(--verdict-unverifiable)]" />
      </span>
    </span>
  );
}

type AuthShellProps = {
  // When provided, the brand panel shows the "verified this week" counter. Auth
  // pages that don't fetch it (sign-up, reset) simply omit it.
  weeklyVerifiedCount?: number;
  children: ReactNode;
};

// Shared visual frame for every auth page: theme toggle + editorial brand panel
// on the left, the page's own form on the right.
export function AuthShell({ weeklyVerifiedCount, children }: AuthShellProps) {
  const t = useTranslations("auth");
  const format = useFormatter();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="relative min-h-screen">
      <button
        type="button"
        aria-label={t("toggleTheme")}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="fixed top-4 right-4 z-20 grid h-10 w-10 place-items-center rounded-md border border-border bg-background/70 text-foreground backdrop-blur transition-colors duration-150 hover:bg-accent"
      >
        {isDark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
      </button>

      <div className="flex min-h-screen flex-col md:flex-row">
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
            {weeklyVerifiedCount !== undefined && (
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-4xl leading-none font-extrabold">
                  {format.number(weeklyVerifiedCount)}
                </span>
                <span className="text-sm text-white/80">{t("weeklyChecks")}</span>
              </div>
            )}
            <div className="flex flex-col gap-3">
              <span className="text-[0.6875rem] font-semibold tracking-[0.1em] uppercase text-white/65">
                {t("fiveVerdicts")}
              </span>
              <div className="flex gap-[7px]">
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-reliable)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-nuanced)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-fragile)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-debunked)]" />
                <i className="h-[6px] flex-1 rounded bg-[var(--verdict-unverifiable)]" />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex flex-1 items-center justify-center bg-background px-6 py-10 md:basis-[54%] md:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
