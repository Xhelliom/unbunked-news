CREATE TYPE "public"."confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('actualité', 'analyse', 'opinion', 'sponsorisé', 'généré-IA');--> statement-breakpoint
CREATE TYPE "public"."framing" AS ENUM('neutre', 'orienté-modéré', 'orienté-marqué', 'militant');--> statement-breakpoint
CREATE TABLE "article_keywords" (
	"article_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	CONSTRAINT "article_keywords_article_id_keyword_pk" PRIMARY KEY("article_id","keyword")
);
--> statement-breakpoint
-- Rename verdict 'biased' -> 'fragile' (docs/SCORING.md §8). Renaming the enum
-- value in place preserves every existing row (they become 'fragile'
-- automatically) and is reversible:
--   ALTER TYPE "public"."verdict" RENAME VALUE 'fragile' TO 'biased';
ALTER TYPE "public"."verdict" RENAME VALUE 'biased' TO 'fragile';--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "corroboration_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "framing" "framing";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "content_type" "content_type";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "fabrication_detected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "domain_impersonation" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "central_claim_debunked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "undisclosed_ai_with_errors" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "global_confidence" "confidence";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "criteria_version" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "model_version" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "evidence" jsonb;--> statement-breakpoint
ALTER TABLE "article_keywords" ADD CONSTRAINT "article_keywords_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_keywords_keyword_idx" ON "article_keywords" USING btree ("keyword");