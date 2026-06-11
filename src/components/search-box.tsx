"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent, type KeyboardEvent } from "react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function SearchBox() {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState("");
  // On a phone the full input doesn't fit the header next to the other
  // actions, so below `sm` it stays a loupe that expands into a full-width
  // overlay on tap.
  const [mobileOpen, setMobileOpen] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (q.length === 0) return;
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") setMobileOpen(false);
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("label")}
        onClick={() => setMobileOpen(true)}
        className="sm:hidden"
      >
        <Search className="size-5" />
      </Button>

      {mobileOpen && (
        <form
          onSubmit={onSubmit}
          role="search"
          className="bg-background absolute inset-x-0 top-0 z-10 flex h-16 items-center gap-2 px-4 sm:hidden"
        >
          <div className="relative flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={t("placeholder")}
              aria-label={t("label")}
              autoFocus
              className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-full border pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t("close")}
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </form>
      )}

      <form onSubmit={onSubmit} role="search" className="relative hidden sm:block">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          className="border-input bg-background focus-visible:ring-ring h-8 w-44 rounded-full border pr-3 pl-8 text-sm focus-visible:ring-2 focus-visible:outline-none lg:w-56"
        />
      </form>
    </>
  );
}
