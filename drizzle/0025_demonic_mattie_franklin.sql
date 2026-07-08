CREATE TABLE "article_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "target_article_id" uuid;--> statement-breakpoint
ALTER TABLE "article_snapshots" ADD CONSTRAINT "article_snapshots_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_snapshots_article_id_idx" ON "article_snapshots" USING btree ("article_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_target_article_id_articles_id_fk" FOREIGN KEY ("target_article_id") REFERENCES "public"."articles"("id") ON DELETE set null ON UPDATE no action;