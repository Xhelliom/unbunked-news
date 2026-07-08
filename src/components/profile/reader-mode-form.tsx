"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { READER_MODES, type ReaderMode } from "@/lib/reader-mode";
import { setReaderMode } from "@/app/[locale]/(public)/profile/actions";

export function ReaderModeForm({ initialMode }: { initialMode: ReaderMode }) {
  const t = useTranslations("profile.reader");
  const router = useRouter();
  const [mode, setMode] = useState<ReaderMode>(initialMode);
  const [isPending, startTransition] = useTransition();

  const select = (next: ReaderMode) => {
    if (next === mode) return;
    setMode(next);
    startTransition(async () => {
      await setReaderMode(next);
      router.refresh();
    });
  };

  return (
    <div className="max-w-sm space-y-3">
      <div
        role="radiogroup"
        aria-label={t("title")}
        className="bg-muted inline-flex rounded-lg p-1"
      >
        {READER_MODES.map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            disabled={isPending}
            onClick={() => select(value)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              mode === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`mode.${value}`)}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-xs">{t(`hint.${mode}`)}</p>
    </div>
  );
}
