import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProposeForm } from "@/components/propose-form";

export default async function ProposePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("propose");

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{t("title")}</CardTitle>
          <p className="text-muted-foreground text-sm">{t("description")}</p>
        </CardHeader>
        <CardContent>
          <ProposeForm />
        </CardContent>
      </Card>
    </div>
  );
}
