import { getTranslations } from "next-intl/server";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/admin/settings-form";
import { requireAdminSession } from "@/lib/session";
import { getAppSettings } from "@/lib/settings";

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const t = await getTranslations("admin.settings");
  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("cardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingsForm
            publicSignupEnabled={settings.publicSignupEnabled}
            aiModerationEnabled={settings.aiModerationEnabled}
          />
        </CardContent>
      </Card>
    </div>
  );
}
