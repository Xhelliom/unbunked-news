import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";

const PRIVACY_SECTIONS = [
  "cookieless",
  "collected",
  "noPersonalData",
  "retention",
  "rights",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("title") };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("privacy");

  return (
    <article className="mx-auto max-w-[760px] px-4 pt-10 pb-20 sm:px-6">
      <h1 className="font-serif text-3xl leading-[1.1] font-bold tracking-tight text-balance sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-4 text-lg leading-[1.55]">
        {t("intro")}
      </p>

      <div className="mt-12 space-y-10">
        {PRIVACY_SECTIONS.map((section) => (
          <section key={section}>
            <h2 className="font-serif text-2xl font-bold tracking-tight">
              {t(`sections.${section}.title`)}
            </h2>
            <p className="text-muted-foreground mt-3 leading-[1.6]">
              {t(`sections.${section}.body`)}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
}
