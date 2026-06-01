-- Rename verdict 'biased' -> 'fragile' (docs/SCORING.md §8). Renaming the enum
-- value in place preserves every existing row (they become 'fragile'
-- automatically) and is reversible:
--   ALTER TYPE "public"."verdict" RENAME VALUE 'fragile' TO 'biased';
ALTER TYPE "public"."verdict" RENAME VALUE 'biased' TO 'fragile';
