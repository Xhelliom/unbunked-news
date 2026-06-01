CREATE TABLE "article_keywords" (
	"article_id" uuid NOT NULL,
	"keyword" text NOT NULL,
	CONSTRAINT "article_keywords_article_id_keyword_pk" PRIMARY KEY("article_id","keyword")
);
--> statement-breakpoint
DROP TABLE "article_rewrites" CASCADE;--> statement-breakpoint
ALTER TABLE "article_keywords" ADD CONSTRAINT "article_keywords_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_keywords_keyword_idx" ON "article_keywords" USING btree ("keyword");