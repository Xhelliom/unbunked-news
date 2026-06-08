import "server-only";

import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";

import { db } from "@/db/client";
import { appSettings, APP_SETTINGS_SINGLETON_ID } from "@/db/schema";

// Single tag so an admin save clears every cached settings read at once.
export const SETTINGS_CACHE_TAG = "app-settings";

// Settings change rarely; a short background revalidate is plenty (seconds).
const SETTINGS_CACHE_REVALIDATE_SECONDS = 300;

// Slim, serialisable view of the operator toggles. The DB row carries audit
// columns (updatedBy / updatedAt) the callers don't need.
export type AppSettings = {
  publicSignupEnabled: boolean;
  aiModerationEnabled: boolean;
};

// Fail-closed defaults: a missing row or a read error must never accidentally
// open public signup or the AI pass.
const CLOSED_DEFAULTS: AppSettings = {
  publicSignupEnabled: false,
  aiModerationEnabled: false,
};

async function loadAppSettings(): Promise<AppSettings> {
  try {
    const row = await db.query.appSettings.findFirst({
      where: eq(appSettings.id, APP_SETTINGS_SINGLETON_ID),
      columns: { publicSignupEnabled: true, aiModerationEnabled: true },
    });
    if (!row) return CLOSED_DEFAULTS;
    return {
      publicSignupEnabled: row.publicSignupEnabled,
      aiModerationEnabled: row.aiModerationEnabled,
    };
  } catch (error) {
    // Surface the failure to the operator's logs, then fail closed.
    console.error("Failed to read app settings, falling back to closed:", error);
    return CLOSED_DEFAULTS;
  }
}

const loadAppSettingsCached = unstable_cache(loadAppSettings, ["app-settings"], {
  revalidate: SETTINGS_CACHE_REVALIDATE_SECONDS,
  tags: [SETTINGS_CACHE_TAG],
});

export async function getAppSettings(): Promise<AppSettings> {
  return loadAppSettingsCached();
}
