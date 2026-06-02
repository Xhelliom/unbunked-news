import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/admin/login-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-3xl items-center px-4 py-16 sm:px-6">
      <Card className="w-full border-border/70 shadow-lg shadow-black/5">
        <CardHeader className="space-y-2 border-b">
          <CardTitle className="font-serif text-2xl tracking-tight">
            {t("loginTitle")}
          </CardTitle>
          <CardDescription className="max-w-xl text-sm">
            {t("loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 sm:pt-8">
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
