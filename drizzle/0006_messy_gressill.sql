CREATE TYPE "public"."device_type" AS ENUM('desktop', 'mobile', 'tablet');--> statement-breakpoint
ALTER TABLE "analytics_events" ADD COLUMN "device_type" "device_type" DEFAULT 'desktop' NOT NULL;--> statement-breakpoint
CREATE INDEX "analytics_events_visitor_hash_idx" ON "analytics_events" USING btree ("visitor_hash");