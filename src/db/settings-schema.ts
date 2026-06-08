import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

// Single-row table: every read and write targets this fixed primary key.
export const APP_SETTINGS_SINGLETON_ID = "singleton";

// Operator-managed runtime toggles (edited from /admin/settings), kept in the DB
// rather than env so they can be flipped without a redeploy.
export const appSettings = pgTable("app_settings", {
  id: text().primaryKey().default(APP_SETTINGS_SINGLETON_ID),
  // Public, non-admin account creation (Google + verified email/password). Off
  // by default so the platform stays admin-only until an operator opts in.
  publicSignupEnabled: boolean().notNull().default(false),
  // Light AI pre-moderation of user contributions. Off by default.
  aiModerationEnabled: boolean().notNull().default(false),
  updatedByUserId: text().references(() => user.id, { onDelete: "set null" }),
  updatedAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const appSettingsRelations = relations(appSettings, ({ one }) => ({
  updatedBy: one(user, {
    fields: [appSettings.updatedByUserId],
    references: [user.id],
  }),
}));

export type AppSettingsRow = typeof appSettings.$inferSelect;
export type NewAppSettingsRow = typeof appSettings.$inferInsert;
