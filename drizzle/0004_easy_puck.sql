ALTER TABLE "articles" ADD COLUMN "factuality_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "sourcing_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "neutrality_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "completeness_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "transparency_score" integer;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "recency_score" integer;--> statement-breakpoint
UPDATE "articles" SET "factuality_score" = "reliability_score" WHERE "factuality_score" IS NULL AND "reliability_score" IS NOT NULL;--> statement-breakpoint
UPDATE "articles" SET "sourcing_score" = "reliability_score" WHERE "sourcing_score" IS NULL AND "reliability_score" IS NOT NULL;--> statement-breakpoint
UPDATE "articles" SET "neutrality_score" = "reliability_score" WHERE "neutrality_score" IS NULL AND "reliability_score" IS NOT NULL;