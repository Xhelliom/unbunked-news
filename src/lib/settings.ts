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

// A missing row genuinely means "closed" and is safe to cache. A read error is
// NOT caught here on purpose: it must propagate so unstable_cache doesn't store
// the failure (see getAppSettings).
async function loadAppSettings(): Promise<AppSettings> {
  const row = await db.query.appSettings.findFirst({
    where: eq(appSettings.id, APP_SETTINGS_SINGLETON_ID),
    columns: { publicSignupEnabled: true, aiModerationEnabled: true },
  });
  if (!row) return CLOSED_DEFAULTS;
  return {
    publicSignupEnabled: row.publicSignupEnabled,
    aiModerationEnabled: row.aiModerationEnabled,
  };
}

const loadAppSettingsCached = unstable_cache(loadAppSettings, ["app-settings"], {
  revalidate: SETTINGS_CACHE_REVALIDATE_SECONDS,
  tags: [SETTINGS_CACHE_TAG],
});

export async function getAppSettings(): Promise<AppSettings> {
  try {
    return await loadAppSettingsCached();
  } catch (error) {
    // Fail closed on a read error, but don't cache it: a single DB blip must not
    // disable signup/AI for the whole revalidate window. Next call retries.
    console.error("Failed to read app settings, failing closed:", error);
    return CLOSED_DEFAULTS;
  }
}
