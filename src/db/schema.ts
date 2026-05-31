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

export const jobStatusEnum = pgEnum("job_status", [
  "pending",
  "running",
  "succeeded",
  "failed",
]);

// Kept in sync with DEVICE_TYPES in src/lib/analytics/constants.ts.
export const deviceTypeEnum = pgEnum("device_type", [
  "desktop",
  "mobile",
  "tablet",
]);

// Kept in sync with EVENT_KINDS in src/lib/analytics/constants.ts.
export const eventKindEnum = pgEnum("event_kind", ["pageview", "read"]);

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
    // Neutral paraphrase of the source article (our words), shown on the
    // article page when the editor opts out of displaying the full original.
    originalSummary: text(),
    // Original article body, paragraphs separated by blank lines, for the
    // annotated reading view. Null for articles processed before this existed.
    content: text(),
    // Editorial toggle: when false, the public page hides the full original
    // body and shows originalSummary instead. Defaults to true.
    showOriginal: boolean().notNull().default(true),
    // og:image from the source (with attribution) or null -> abstract fallback.
    imageUrl: text(),
    imageAttribution: text(),
    verdict: verdictEnum(),
    // Overall reliability (0-100), produced by the AI to stay coherent with the
    // verdict. The sub-scores below decompose it for a finer reading: the three
    // core ones are always scored, the three optional ones are null when the AI
    // can't judge them reliably (e.g. no funding disclosure to rate).
    reliabilityScore: integer(),
    factualityScore: integer(),
    sourcingScore: integer(),
    neutralityScore: integer(),
    completenessScore: integer(),
    transparencyScore: integer(),
    recencyScore: integer(),
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
    // Verbatim excerpt from the article body that this claim is drawn from,
    // used to anchor the claim to its paragraph in the reading view.
    sourceQuote: text(),
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

// Unbunked-fiable rewrite of the source article, one row per locale.
// Markdown body; uses [[claim:N]] markers to link to claims by position.
export const articleRewrites = pgTable(
  "article_rewrites",
  {
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    locale: varchar({ length: 5 }).notNull(),
    title: text().notNull(),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.locale] })],
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

// Background analysis jobs (scrape -> claims -> web search -> verdict).
export const jobs = pgTable(
  "jobs",
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid().references(() => articles.id, { onDelete: "set null" }),
    url: text().notNull(),
    status: jobStatusEnum().notNull().default("pending"),
    // Human-readable current step for the admin progress UI.
    step: text(),
    progress: integer().notNull().default(0),
    // Number of times the queue worker has claimed this job. Bounds reaper
    // retries so a job that repeatedly stalls eventually fails for good.
    attempts: integer().notNull().default(0),
    error: text(),
    startedAt: timestamp({ withTimezone: true, mode: "date" }),
    finishedAt: timestamp({ withTimezone: true, mode: "date" }),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("jobs_status_idx").on(table.status)],
);

// Privacy-first, cookieless analytics. No personal data is stored: we keep the
// pathname (query string stripped), the resolved article, the locale and the
// external referrer host. `visitorHash` is a daily-rotating salted hash of
// IP+UA — irreversible and useless across days, so it is not a persistent
// identifier and needs no cookie consent under the GDPR/ePrivacy rules.
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    path: text().notNull(),
    articleId: uuid().references(() => articles.id, { onDelete: "set null" }),
    locale: varchar({ length: 5 }).notNull(),
    referrerHost: text(),
    deviceType: deviceTypeEnum().notNull().default("desktop"),
    kind: eventKindEnum().notNull().default("pageview"),
    visitorHash: text().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("analytics_events_created_at_idx").on(table.createdAt),
    index("analytics_events_article_id_idx").on(table.articleId),
    index("analytics_events_path_idx").on(table.path),
    index("analytics_events_visitor_hash_idx").on(table.visitorHash),
  ],
);

export const articlesRelations = relations(articles, ({ many }) => ({
  claims: many(claims),
  articleTags: many(articleTags),
  rewrites: many(articleRewrites),
  jobs: many(jobs),
}));

export const articleRewritesRelations = relations(
  articleRewrites,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleRewrites.articleId],
      references: [articles.id],
    }),
  }),
);

export const jobsRelations = relations(jobs, ({ one }) => ({
  article: one(articles, {
    fields: [jobs.articleId],
    references: [articles.id],
  }),
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
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
export type ArticleRewrite = typeof articleRewrites.$inferSelect;
export type NewArticleRewrite = typeof articleRewrites.$inferInsert;
