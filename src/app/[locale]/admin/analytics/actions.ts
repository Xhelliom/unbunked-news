"use server";

import { lt } from "drizzle-orm";
import { getLocale } from "next-intl/server";

import { db } from "@/db/client";
import { analyticsEvents } from "@/db/schema";
import { redirect } from "@/i18n/navigation";
import { ANALYTICS_RETENTION_DAYS, DAY_MS } from "@/lib/analytics/constants";
import { requireSession } from "@/lib/session";

export async function purgeOldEvents(): Promise<void> {
  await requireSession();
  const cutoff = new Date(Date.now() - ANALYTICS_RETENTION_DAYS * DAY_MS);
  await db.delete(analyticsEvents).where(lt(analyticsEvents.createdAt, cutoff));
  redirect({ href: "/admin/analytics", locale: await getLocale() });
}
