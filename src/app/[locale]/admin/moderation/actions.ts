"use server";

import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { contributions } from "@/db/contributions-schema";
import { redirect } from "@/i18n/navigation";
import { ARTICLES_CACHE_TAG } from "@/lib/articles";
import { REVALIDATE_PROFILE } from "@/lib/cache";
import { requireAdminSession } from "@/lib/session";

const MODERATION_ROUTE = "/admin/moderation";

async function moderate(
  formData: FormData,
  status: "approved" | "rejected",
): Promise<void> {
  const { userId } = await requireAdminSession();
  const id = String(formData.get("id") ?? "");
  if (id) {
    await db
      .update(contributions)
      .set({ status, moderatedByUserId: userId, moderatedAt: new Date() })
      .where(eq(contributions.id, id));
    // Approving exposes the contribution on the public page; rejecting may pull
    // a previously-approved one back. Either way the article reads must refresh.
    revalidateTag(ARTICLES_CACHE_TAG, REVALIDATE_PROFILE);
  }
  redirect({ href: MODERATION_ROUTE, locale: await getLocale() });
}

export async function approveContribution(formData: FormData): Promise<void> {
  await moderate(formData, "approved");
}

export async function rejectContribution(formData: FormData): Promise<void> {
  await moderate(formData, "rejected");
}
