import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { VerdictBadge } from "@/components/verdict-badge";
import { VERDICTS } from "@/lib/verdicts";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const tv = await getTranslations("verdicts");

  return (
    <>
      <section className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="text-primary text-sm font-semibold tracking-wider uppercase">
            {t("kicker")}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-5 max-w-2xl text-lg">
            {t("body")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="font-serif text-2xl font-bold tracking-tight">
          {tv("title")}
        </h2>
        <p className="text-muted-foreground mt-2">{tv("subtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERDICTS.map((verdict) => (
            <Card key={verdict}>
              <CardHeader>
                <div>
                  <VerdictBadge verdict={verdict} />
                </div>
                <CardDescription className="mt-2 text-sm">
                  {tv(`${verdict}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
