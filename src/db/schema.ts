import { relations, sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import {
  CONFIDENCE_LEVELS,
  CONTENT_TYPE_VALUES,
  FRAMING_VALUES,
} from "@/lib/score-criteria";
import { RUBRICS } from "@/lib/rubrics";

// Postgres full-text search vector. Drizzle has no native tsvector column type,
// so we declare a minimal custom type for it (used only as a generated column).
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});
import type { RunDiagnostics } from "@/lib/pipeline/diagnostics";
import type { JobLive, PauseInfo } from "@/lib/pipeline/job-live";
import type { AnalysisEvidence } from "@/lib/pipeline/schemas";
import type { ScrapeProvenance } from "@/lib/scrape";

// BetterAuth tables (user, session, account, verification).
export * from "./auth-schema";
// Operator-managed runtime settings (admin toggles); references the `user` table.
export * from "./settings-schema";

// Verdict values are kept in sync with src/lib/verdicts.ts (the UI source).
export const verdictEnum = pgEnum("verdict", [
  "reliable",
  "nuanced",
  "fragile",
  "debunked",
  "unverifiable",
]);

// v1.2 scoring descriptors and global confidence. Values kept in sync with
// src/lib/score-criteria.ts (the scoring source of truth).
export const framingEnum = pgEnum("framing", [...FRAMING_VALUES]);
export const contentTypeEnum = pgEnum("content_type", [...CONTENT_TYPE_VALUES]);
export const confidenceEnum = pgEnum("confidence", [...CONFIDENCE_LEVELS]);

// Fixed editorial taxonomy, one per article. Values kept in sync with
// src/lib/rubrics.ts (the navigation source of truth).
export const rubricEnum = pgEnum("rubric", [...RUBRICS]);

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
  "paused",
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
    // How the body was scraped (extractor / AI recovery / headless render), for
    // admin diagnosis of a bad scrape. Null for rows processed before this.
    scrapeDebug: jsonb().$type<ScrapeProvenance>(),
    // Editorial toggle: when false, the public page hides the full original
    // body and shows originalSummary instead. Defaults to true.
    showOriginal: boolean().notNull().default(true),
    // When true, signed-in users may submit contributions on the public page.
    contributionsEnabled: boolean().notNull().default(false),
    // og:image from the source (with attribution) or null -> abstract fallback.
    imageUrl: text(),
    imageAttribution: text(),
    verdict: verdictEnum(),
    // Overall reliability (0-100), DERIVED by the code from the weighted
    // sub-scores (v1.2; docs/SCORING.md §7). Null when the verdict is
    // `unverifiable` — the UI then shows "—" instead of a misleading bar.
    reliabilityScore: integer(),
    // Per-criterion scores, each clamped into its level's band. The five core
    // criteria are always scored; recency is null for timeless content.
    factualityScore: integer(),
    corroborationScore: integer(),
    sourcingScore: integer(),
    completenessScore: integer(),
    transparencyScore: integer(),
    recencyScore: integer(),
    // Legacy v1.0 criterion, replaced by the `framing` descriptor +
    // `completeness`. Kept nullable for historical rows; no longer written.
    neutralityScore: integer(),
    // Unscored descriptors (chips), never folded into the score.
    framing: framingEnum(),
    contentType: contentTypeEnum(),
    // Deterministic killswitch flags raised by the AI, capped by the code.
    fabricationDetected: boolean().notNull().default(false),
    domainImpersonation: boolean().notNull().default(false),
    centralClaimDebunked: boolean().notNull().default(false),
    undisclosedAIWithErrors: boolean().notNull().default(false),
    // Code-derived confidence in the overall score.
    globalConfidence: confidenceEnum(),
    // Provenance for replicability (docs/SCORING.md §12).
    criteriaVersion: text(),
    modelVersion: text(),
    // Frozen audit snapshot: per-criterion level/score/confidence/rationale/
    // sources + killswitch signals. Lets a third party replay the verdict.
    evidence: jsonb().$type<AnalysisEvidence>(),
    // Fixed editorial rubric (one per article). Added nullable so existing rows
    // can be backfilled (data migration 0020) before a later migration flips it
    // to NOT NULL; the pipeline always sets it on new rows.
    rubric: rubricEnum(),
    // Postgres-maintained full-text index over the headline, summary and body.
    // Generated-column expressions can't reference the table being defined, so
    // column names are inlined here (documented exception, see CLAUDE.md).
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('french', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))`,
    ),
    locale: varchar({ length: 5 }).notNull().default("fr"),
    published: boolean().notNull().default(false),
    publishedAt: timestamp({ withTimezone: true, mode: "date" }),
    // Soft delete: set when an admin trashes the article. Non-null rows are
    // hidden from every public read and from the dashboard's default list, but
    // kept so they can be restored or relaunched (re-analysed from urlOrigine).
    deletedAt: timestamp({ withTimezone: true, mode: "date" }),
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
    index("articles_deleted_at_idx").on(table.deletedAt),
    index("articles_rubric_idx").on(table.rubric),
    index("articles_search_vector_idx").using("gin", table.searchVector),
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

// AI-generated keywords identifying the precise subject of an article,
// normalized (slugified) so casing/accents don't block cross-article matching.
// Used to suggest reliable articles on the same topic.
export const articleKeywords = pgTable(
  "article_keywords",
  {
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    keyword: text().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.keyword] }),
    index("article_keywords_keyword_idx").on(table.keyword),
  ],
);

// DEPRECATED: the open tag cloud is being replaced by the fixed `rubric` enum.
// Kept only so the heuristic backfill (src/db/backfill-rubrics.local.ts) can read
// existing assignments; dropped once every article has a rubric (final migration).
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
    // Reasoning-tier model chosen at submission (see SELECTABLE_REASONING_MODELS).
    // Null means "use the default tier" — kept for jobs created before the picker
    // existed and for jobs created without an explicit choice (e.g. proposals).
    model: text(),
    status: jobStatusEnum().notNull().default("pending"),
    // Human-readable current step for the admin progress UI.
    step: text(),
    progress: integer().notNull().default(0),
    // Number of times the queue worker has claimed this job. Bounds reaper
    // retries so a job that repeatedly stalls eventually fails for good.
    attempts: integer().notNull().default(0),
    error: text(),
    // Per-step audit trail (stop reasons, token counts, truncation, warnings)
    // captured during the run, for admin diagnosis. Null for jobs run before
    // this existed or that never started.
    diagnostics: jsonb().$type<RunDiagnostics>(),
    // Admin-tunable limits applied to a resumed run (see the long-article
    // preflight pause in run.ts). Null means "use the pipeline default".
    maxClaims: integer(),
    maxSearchRounds: integer(),
    // Set true when an admin resumes a paused run, so the preflight gate is
    // crossed exactly once instead of re-pausing on the resume re-scrape.
    pauseAck: boolean().notNull().default(false),
    // Why the run paused + the suggested limits shown to the admin. Null unless
    // the job is (or was) paused for review.
    pauseInfo: jsonb().$type<PauseInfo>(),
    // Rolling snapshot of in-flight metrics (claims found, search round, emerging
    // verdict) polled by the admin progress UI. Null before the run starts.
    live: jsonb().$type<JobLive>(),
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

// Token consumption recorded when the pipeline finishes, so the admin has a
// financial view of what each article cost to produce. One row per (article,
// model): a tiered run spends on several models (e.g. Haiku for extraction,
// Sonnet for judgement), each priced differently, so the model belongs in the
// key. The monetary cost is derived from these counts at read time (see
// src/lib/pipeline/pricing.ts) so a later price change reprices history. Web
// search is billed separately from tokens, so its request count and the provider
// that ran it are tracked alongside (see SEARCH_PROVIDERS).
export const articleTokenUsage = pgTable(
  "article_token_usage",
  {
    articleId: uuid()
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    // The Claude model used, so the correct price applies even if it changes.
    model: text().notNull(),
    inputTokens: integer().notNull().default(0),
    outputTokens: integer().notNull().default(0),
    cacheCreationTokens: integer().notNull().default(0),
    cacheReadTokens: integer().notNull().default(0),
    // Web search requests issued during verification, priced per provider. Kept
    // raw (not as a cost) so a price change reprices history like the tokens do.
    webSearchRequests: integer().notNull().default(0),
    // Plain text rather than a pgEnum on purpose: external providers are still
    // experimental, so the set must grow without an ALTER TYPE migration. The
    // canonical list lives in SEARCH_PROVIDERS; costForSearch prices unknown
    // values via a fallback rather than rejecting them.
    searchProvider: text().notNull().default("anthropic"),
    createdAt: timestamp({ withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.model] }),
    index("article_token_usage_created_at_idx").on(table.createdAt),
  ],
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
  keywords: many(articleKeywords),
  jobs: many(jobs),
  tokenUsage: many(articleTokenUsage),
}));

export const articleKeywordsRelations = relations(
  articleKeywords,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleKeywords.articleId],
      references: [articles.id],
    }),
  }),
);

export const articleTokenUsageRelations = relations(
  articleTokenUsage,
  ({ one }) => ({
    article: one(articles, {
      fields: [articleTokenUsage.articleId],
      references: [articles.id],
    }),
  }),
);

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
export type ArticleKeyword = typeof articleKeywords.$inferSelect;
export type NewArticleKeyword = typeof articleKeywords.$inferInsert;
export type ArticleTokenUsage = typeof articleTokenUsage.$inferSelect;
export type NewArticleTokenUsage = typeof articleTokenUsage.$inferInsert;
