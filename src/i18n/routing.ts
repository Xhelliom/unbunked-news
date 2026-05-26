import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // FR served at "/", EN at "/en". Keeps the default locale prefix-free.
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
