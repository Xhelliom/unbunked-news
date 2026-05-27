import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// BetterAuth tables (user, session, account, verification).
export * from "./auth-schema";

// Verdict values are kept in sync with src/lib/verdicts.ts (the UI source).
export const verdictEnum = pgEnum("verdict", [
  "reliable",
  "nuanced",
  "biased",
  "debunked",
  "unverifiable",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "supported",
  "partly_true",
  "misleading",
  "false",
  "unverifiable",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const articles = pgTable(
  "articles",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    // Source of the claim being fact-checked.
    urlOrigine: text().notNull(),
    sourceName: text().notNull(),
    originalTitle: text(),
    // Our headline, framed as the claim/question under examination.
    title: text().notNull(),
    summary: text(),
    // og:image from the source (with attribution) or null -> abstract fallback.
    imageUrl: text(),
    imageAttribution: text(),
    verdict: verdictEnum(),
    reliabilityScore: integer(),
    locale: varchar({ length: 5 }).notNull().default("fr"),
    published: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true, mode: "date" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("articles_verdict_idx").on(table.verdict),
    index("articles_published_idx").on(table.published, table.publishedAt),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
    claimText: text().notNull(),
    status: claimStatusEnum().notNull(),
    explanation: text(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("claims_article_id_idx").on(table.articleId)],
);

// sources_utilisees[] for a claim, normalized into rows.
export const claimSources = pgTable(
  "claim_sources",
  {
    id: uuid().primaryKey().defaultRandom(),
    claimId: uuid()
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    url: text().notNull(),
    title: text(),
    publisher: text(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("claim_sources_claim_id_idx").on(table.claimId)],
);

export const tags = pgTable("tags", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  label: text().notNull(),
  // Hex color for the tag chip.
  color: text().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const articleTags = pgTable(
  "article_tags",
  {
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    tagId: uuid()
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.tagId] }),
    index("article_tags_tag_id_idx").on(table.tagId),
  ],
);

export const proposals = pgTable("proposals", {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  email: text(),
  status: proposalStatusEnum().notNull().default("pending"),
  createdAt: timestamp({ withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const articlesRelations = relations(articles, ({ many }) => ({
  claims: many(claims),
  articleTags: many(articleTags),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  article: one(articles, {
    fields: [claims.articleId],
    references: [articles.id],
  }),
  sources: many(claimSources),
}));

export const claimSourcesRelations = relations(claimSources, ({ one }) => ({
  claim: one(claims, {
    fields: [claimSources.claimId],
    references: [claims.id],
  }),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  articleTags: many(articleTags),
}));

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
  }),
  tag: one(tags, {
    fields: [articleTags.tagId],
    references: [tags.id],
  }),
}));

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type ClaimSource = typeof claimSources.$inferSelect;
export type NewClaimSource = typeof claimSources.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
