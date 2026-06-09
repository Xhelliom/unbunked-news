import { relations } from "drizzle-orm";
import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import {
  AI_MODERATION_VERDICTS,
  CONTRIBUTION_STATUSES,
} from "@/lib/contributions/constants";
import { user } from "./auth-schema";
import { articles, claims } from "./schema";

// Enums derive from the single source of truth in lib/contributions/constants.
export const contributionStatusEnum = pgEnum("contribution_status", [
  ...CONTRIBUTION_STATUSES,
]);
export const aiModerationVerdictEnum = pgEnum("ai_moderation_verdict", [
  ...AI_MODERATION_VERDICTS,
]);

// Reader-submitted corrections / source suggestions, attached to a claim or to
// the whole article, moderated before they appear publicly.
export const contributions = pgTable(
  "contributions",
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    // Null = a contribution about the article as a whole.
    claimId: uuid().references(() => claims.id, { onDelete: "cascade" }),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text().notNull(),
    sourceUrl: text(),
    status: contributionStatusEnum().notNull().default("pending"),
    // AI pre-moderation verdict (null when the pass is off or not yet run).
    aiVerdict: aiModerationVerdictEnum(),
    aiReason: text(),
    aiModel: text(),
    moderatedByUserId: text().references(() => user.id, {
      onDelete: "set null",
    }),
    moderatedAt: timestamp({ withTimezone: true, mode: "date" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("contributions_article_id_idx").on(table.articleId),
    index("contributions_claim_id_idx").on(table.claimId),
    index("contributions_user_id_idx").on(table.userId),
    index("contributions_status_idx").on(table.status),
    // Backs the per-user rate-limit window count.
    index("contributions_user_created_at_idx").on(
      table.userId,
      table.createdAt,
    ),
  ],
);

export const contributionsRelations = relations(contributions, ({ one }) => ({
  article: one(articles, {
    fields: [contributions.articleId],
    references: [articles.id],
  }),
  claim: one(claims, {
    fields: [contributions.claimId],
    references: [claims.id],
  }),
  author: one(user, {
    fields: [contributions.userId],
    references: [user.id],
  }),
}));

export type Contribution = typeof contributions.$inferSelect;
export type NewContribution = typeof contributions.$inferInsert;
