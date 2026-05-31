CREATE TYPE "public"."event_kind" AS ENUM('pageview', 'read');--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "kind" "event_kind" DEFAULT 'pageview' NOT NULL;