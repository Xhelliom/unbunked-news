import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { getPublishedArticlesForSitemap } from "@/lib/articles";
import { absoluteUrl } from "@/lib/seo/site";

// Rendered at request time, not baked at build: the article set changes on every
// publish, and the build host has no database connection.
export const dynamic = "force-dynamic";

// Public, translated pages that exist in every locale. Each emits one sitemap
// entry (at the default-locale URL) carrying hreflang alternates for the rest.
const STATIC_PATHS = [
  { path: "/", changeFrequency: "hourly" as const, priority: 1 },
  { path: "/methode", changeFrequency: "monthly" as const, priority: 0.6 },
  { path: "/recherche", changeFrequency: "weekly" as const, priority: 0.4 },
  {
    path: "/confidentialite",
    changeFrequency: "yearly" as const,
    priority: 0.2,
  },
];

function languageAlternates(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(path, locale);
  }
  languages["x-default"] = absoluteUrl(path, routing.defaultLocale);
  return languages;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((entry) => ({
    url: absoluteUrl(entry.path, routing.defaultLocale),
    lastModified: now,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: { languages: languageAlternates(entry.path) },
  }));

  // Articles are single-locale (no translated counterpart at a distinct URL), so
  // each is listed once at its native-locale canonical, no hreflang alternates.
  const articles = await getPublishedArticlesForSitemap();
  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: absoluteUrl(`/article/${article.slug}`, article.locale),
    lastModified: article.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...articleEntries];
}
