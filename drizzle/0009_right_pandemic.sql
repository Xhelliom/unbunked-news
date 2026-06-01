CREATE TYPE "public"."confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('actualité', 'analyse', 'opinion', 'sponsorisé', 'généré-IA');--> statement-breakpoint
CREATE TYPE "public"."framing" AS ENUM('neutre', 'orienté-modéré', 'orienté-marqué', 'militant');--> statement-breakpoint
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
ALTER TABLE "articles" ADD COLUMN "evidence" jsonb;