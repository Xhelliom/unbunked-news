# Plan d'implémentation — Rubriques, keywords invisibles & recherche

Spec : [2026-06-03-article-rubriques-design.md](../specs/2026-06-03-article-rubriques-design.md)
Branche : `feature/article-rubriques`

Chaque phase = un commit vert (`pnpm test` + typecheck) avant la suivante.

## Phase 1 — Source de vérité rubriques + i18n
- `src/lib/rubrics.ts` : `RUBRICS` (8 slugs ordonnés), type `Rubric`,
  `isRubric(v): v is Rubric`. Test `rubrics.test.ts`.
- `messages/fr.json` + `messages/en.json` : namespace `rubrics.<slug>.label` (8),
  namespace `search.*` (placeholder/empty/title).
- Pas encore de DB. Commit.

## Phase 2 — Schéma DB + migration
- `schema.ts` : `rubricEnum` (depuis `RUBRICS`), colonne `articles.rubric`
  (nullable d'abord), index `articles_rubric_idx`. Colonne générée `searchVector`
  (`tsvector` `french`, `generatedAlwaysAs(sql\`…\`)`) + index GIN. Retirer
  `tags`, `articleTags`, relations, types `Tag`/`NewTag`.
- `db:generate` → migration. Éditer la migration pour l'ordre :
  enum → add column nullable → (backfill fait en phase 3) → searchVector/GIN.
  Le `DROP TABLE` tags/article_tags placé **après** le backfill (phase 3).
- Compile only (pas de push DB ici). Commit.

## Phase 3 — Backfill + bascule NOT NULL
- `src/db/backfill-rubrics.local.ts` : Drizzle query builder, mapping
  `politics→politique, environment→ecologie, health→sciences-sante,
  tech→sciences-sante`, fallback `societe` + warn. Table de mapping pure testée
  (`backfill-rubrics.test.ts`).
- Migration finale : `SET NOT NULL` sur `rubric`, puis `DROP TABLE article_tags, tags`.
- Commit.

## Phase 4 — Pipeline IA
- `schemas.ts` : `tags[]` → `rubric` (enum required, 8 slugs). `keywords` inchangé.
- `aggregate.ts` : valider `rubric` (∈ liste sinon `societe`).
- `run.ts` : écrire `articles.rubric`, retirer upsert tags + `colorForTag`.
- `diagnostics.ts` : retirer métriques tags, garder keywords.
- Tests pipeline existants verts. Commit.

## Phase 5 — Lectures & home
- `articles.ts` : `getPublishedArticles({ verdict, rubric })`, supprimer
  `getAllTags`, retirer les `with: { articleTags }`, exposer `rubric`.
- `feed-filters.tsx` : chips = 8 rubriques (i18n) + bloc verdict conservé.
- `(public)/page.tsx` : `searchParams.tag` → `rubric`, `sectionTitle` i18n rubrique.
- Cards (`article-card`, `hero-card`, `secondary-card`) : libellé rubrique.
- Pages article public + admin : bloc tags → rubrique.
- Commit.

## Phase 6 — Recherche
- `getSearchResults(q, locale)` (dans `articles.ts` ou `search.ts`) : FTS
  `plainto_tsquery('french', q)` vs `searchVector`, `ts_rank`, filtres
  published/deleted/locale. Test de non-régression requête.
- `site-header.tsx` : loupe + champ → `/[locale]/recherche?q=`.
- `(public)/recherche/page.tsx` : liste `ArticleCard` + état vide i18n.
- Commit.

## Phase 7 — Seed + finitions
- `seed-articles-data.ts` / `seed-articles.ts` : seeder `rubric`, retirer `TAGS`/`tagSlug`.
- `pnpm test` + `pnpm build` verts.
- Push + PR.

## Risques
- Colonne générée tsvector : syntaxe `generatedAlwaysAs` Drizzle → vérifier le SQL
  produit par `db:generate`, ajuster à la main si besoin.
- `DROP TABLE tags` irréversible : labels libres perdus après backfill (validé).
- Ordre migration enum/colonne/notnull : ne pas mettre `NOT NULL` avant backfill.
