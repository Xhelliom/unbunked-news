CREATE TABLE "article_rewrites" (
	"article_id" uuid NOT NULL,
	"locale" varchar(5) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_rewrites_article_id_locale_pk" PRIMARY KEY("article_id","locale")
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "original_summary" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "content" text;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "show_original" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "source_quote" text;--> statement-breakpoint
ALTER TABLE "article_rewrites" ADD CONSTRAINT "article_rewrites_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;