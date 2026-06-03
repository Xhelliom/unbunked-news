"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { useRouter } from "@/i18n/navigation";

export function SearchBox() {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState("");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = value.trim();
    if (q.length === 0) return;
    router.push(`/recherche?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={onSubmit} role="search" className="relative block">
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
        className="border-input bg-background focus-visible:ring-ring h-8 w-32 rounded-full border pr-3 pl-8 text-sm focus-visible:ring-2 focus-visible:outline-none sm:w-44 lg:w-56"
      />
    </form>
  );
}
