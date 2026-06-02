import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { updateOwnProfile } from "@/app/[locale]/admin/actions";
import { db } from "@/db/client";
import { user } from "@/db/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/session";

type AdminAccountPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const ACCOUNT_ERROR_KEYS = {
  missingName: "errors.missingName",
  missingEmail: "errors.missingEmail",
  weakPassword: "errors.weakPassword",
  emailAlreadyExists: "errors.emailAlreadyExists",
  userNotFound: "errors.userNotFound",
} as const;

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  if (parts.length === 0) return "U";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function AdminAccountPage({
  searchParams,
}: AdminAccountPageProps) {
  const t = await getTranslations("admin.account");
  const { userId } = await requireAdminSession();
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { name: true, email: true },
  });
  const resolvedSearchParams = await searchParams;
  const rawError = resolvedSearchParams.error;
  const isUpdated = resolvedSearchParams.updated === "1";
  const errorMessage =
    typeof rawError === "string" && rawError in ACCOUNT_ERROR_KEYS
      ? t(ACCOUNT_ERROR_KEYS[rawError as keyof typeof ACCOUNT_ERROR_KEYS])
      : null;

  const name = currentUser?.name ?? "";
  const email = currentUser?.email ?? "";
  const initials = initialsFromName(name);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <section className="space-y-4 rounded-lg border p-5">
        {/* Avatar simple basé sur les initiales pour identifier rapidement le compte. */}
        <div className="flex items-center gap-3">
          <div className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full text-sm font-semibold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{name}</p>
            <p className="text-muted-foreground truncate text-sm">{email}</p>
          </div>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}
        {isUpdated ? (
          <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            {t("updated")}
          </p>
        ) : null}

        <form action={updateOwnProfile} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm">{t("fields.name")}</span>
            <Input name="name" type="text" required defaultValue={name} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">{t("fields.email")}</span>
            <Input name="email" type="email" required defaultValue={email} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm">{t("fields.password")}</span>
            <Input
              name="password"
              type="password"
              minLength={8}
              placeholder={t("fields.passwordPlaceholder")}
            />
          </label>
          <Button type="submit">{t("save")}</Button>
        </form>
      </section>
    </div>
  );
}
