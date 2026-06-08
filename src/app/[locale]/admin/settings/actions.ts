"use server";

import { revalidateTag } from "next/cache";

import { db } from "@/db/client";
import { appSettings, APP_SETTINGS_SINGLETON_ID } from "@/db/schema";
import { requireAdminSession } from "@/lib/session";
import { SETTINGS_CACHE_TAG } from "@/lib/settings";

export type SettingsActionState = { status: "idle" } | { status: "saved" };

// Next 16's revalidateTag takes a cache profile; "max" clears every entry.
const REVALIDATE_PROFILE = "max";

export async function updateAppSettings(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const { userId } = await requireAdminSession();

  // The wire is untyped: read each checkbox explicitly as a boolean.
  const publicSignupEnabled = formData.get("publicSignupEnabled") === "on";
  const aiModerationEnabled = formData.get("aiModerationEnabled") === "on";

  await db
    .insert(appSettings)
    .values({
      id: APP_SETTINGS_SINGLETON_ID,
      publicSignupEnabled,
      aiModerationEnabled,
      updatedByUserId: userId,
    })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { publicSignupEnabled, aiModerationEnabled, updatedByUserId: userId },
    });

  revalidateTag(SETTINGS_CACHE_TAG, REVALIDATE_PROFILE);
  return { status: "saved" };
}
