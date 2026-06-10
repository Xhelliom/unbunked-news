ALTER TYPE "public"."job_status" ADD VALUE 'paused' BEFORE 'succeeded';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "max_claims" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "max_search_rounds" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "pause_ack" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "pause_info" jsonb;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "live" jsonb;