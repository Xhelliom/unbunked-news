import { getTranslations } from "next-intl/server";

import { db } from "@/db/client";
import {
  createMember,
  deleteMember,
  setMemberPassword,
  updateMember,
} from "@/app/[locale]/admin/actions";
import { MemberManagementClient } from "@/components/admin/member-management-client";

type AdminMembersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const MEMBER_ERROR_KEYS = {
  missingMemberId: "errors.missingMemberId",
  missingMemberName: "errors.missingMemberName",
  missingMemberEmail: "errors.missingMemberEmail",
  missingMemberPassword: "errors.missingMemberPassword",
  weakPassword: "errors.weakPassword",
  memberEmailAlreadyExists: "errors.memberEmailAlreadyExists",
  memberNotFound: "errors.memberNotFound",
  cannotDemoteSelf: "errors.cannotDemoteSelf",
  cannotDeleteSelf: "errors.cannotDeleteSelf",
  cannotDemoteLastAdmin: "errors.cannotDemoteLastAdmin",
} as const;

export default async function AdminMembersPage({
  searchParams,
}: AdminMembersPageProps) {
  const t = await getTranslations("admin.members");
  const resolvedSearchParams = await searchParams;
  const rawError = resolvedSearchParams.error;
  const errorMessage =
    typeof rawError === "string" && rawError in MEMBER_ERROR_KEYS
      ? t(MEMBER_ERROR_KEYS[rawError as keyof typeof MEMBER_ERROR_KEYS])
      : null;
  const members = await db.query.user.findMany({
    columns: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
    },
    orderBy: (member, { desc }) => [desc(member.createdAt)],
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>
      {errorMessage ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}
      <MemberManagementClient
        members={members}
        createMemberAction={createMember}
        updateMemberAction={updateMember}
        setMemberPasswordAction={setMemberPassword}
        deleteMemberAction={deleteMember}
      />
    </div>
  );
}
