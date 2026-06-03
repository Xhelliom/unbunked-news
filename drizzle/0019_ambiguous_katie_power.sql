CREATE TYPE "public"."rubric" AS ENUM('france', 'international', 'politique', 'economie-social', 'ecologie', 'sciences-sante', 'culture-idees', 'societe');--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "rubric" "rubric";--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('french', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))) STORED;--> statement-breakpoint
CREATE INDEX "articles_rubric_idx" ON "articles" USING btree ("rubric");--> statement-breakpoint
CREATE INDEX "articles_search_vector_idx" ON "articles" USING gin ("search_vector");