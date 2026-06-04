-- Data backfill: assign a rubric to every pre-existing article whose rubric is
-- still NULL (rows that predate migration 0019, which added the nullable column).
-- The pipeline sets the rubric on all NEW articles, so this only touches legacy
-- rows. Running it here means it applies automatically via the db-migrate Job in
-- every environment, and unblocks the later migration that flips rubric NOT NULL.
--
-- The (tag slug -> rubric) mapping below is a frozen snapshot of the bilingual
-- heuristic in src/lib/tag-rubric-map.ts at the time of this migration; a
-- migration is immutable history, so this duplication is intentional and safe.
-- The `priority` column is the editorial tie-break when an article carries
-- several mappable tags: lowest number wins
-- (politique > ecologie > economie-social > sciences-sante). Articles with no
-- mappable tag fall back to the catch-all 'societe' so that NO row stays NULL.
UPDATE "articles" a
SET "rubric" = COALESCE(
  (
    SELECT tm.rubric
    FROM "article_tags" at
    JOIN "tags" t ON t.id = at.tag_id
    JOIN (
      VALUES
        ('politics', 'politique', 1),
        ('economy', 'economie-social', 3),
        ('environment', 'ecologie', 2),
        ('environnement', 'ecologie', 2),
        ('energie', 'ecologie', 2),
        ('health', 'sciences-sante', 4),
        ('tech', 'sciences-sante', 4),
        ('technology', 'sciences-sante', 4),
        ('technologie', 'sciences-sante', 4),
        ('intelligence-artificielle', 'sciences-sante', 4),
        ('science', 'sciences-sante', 4),
        ('astronomy', 'sciences-sante', 4),
        ('space', 'sciences-sante', 4)
    ) AS tm(slug, rubric, priority) ON tm.slug = t.slug
    WHERE at.article_id = a.id
    ORDER BY tm.priority ASC
    LIMIT 1
  ),
  'societe'
)::"rubric"
WHERE a."rubric" IS NULL;
