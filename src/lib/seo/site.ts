import { routing } from "@/i18n/routing";

// Canonical production origin. Every absolute URL we emit for crawlers (canonical
// tags, hreflang alternates, sitemap, JSON-LD) derives from this. Override per
// environment with NEXT_PUBLIC_SITE_URL; the fallback is the production domain.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://unbunked.news"
).replace(/\/$/, "");

// The brand, spelled exactly. Repeated in <title> templates, OpenGraph siteName
// and the Organization schema so Google learns "Unbunked" as an entity and stops
// auto-correcting it to "debunked".
export const SITE_NAME = "Unbunked";

// Off-site profiles that anchor the brand entity. Populate as accounts go live;
// Google reads these (sameAs) to disambiguate "Unbunked" from "debunked".
export const SITE_SAME_AS: readonly string[] = [];

// Maps an app-relative path ("/", "/article/x") to its locale-prefixed form,
// mirroring routing.localePrefix = "as-needed": the default locale stays
// prefix-free, others get a "/<locale>" prefix.
export function localizedPath(path: string, locale: string): string {
  const suffix = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? path : `/${locale}${suffix}`;
}

export function absoluteUrl(path: string, locale: string): string {
  return `${SITE_URL}${localizedPath(path, locale)}`;
}

// Builds the canonical + hreflang alternates block for a given path, ready to
// spread into a Next Metadata `alternates` field. `x-default` points at the
// default locale so Google has a fallback for unmatched languages.
export function buildAlternates(
  path: string,
  currentLocale: string,
): { canonical: string; languages: Record<string, string> } {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(path, locale);
  }
  languages["x-default"] = absoluteUrl(path, routing.defaultLocale);
  return { canonical: absoluteUrl(path, currentLocale), languages };
}
