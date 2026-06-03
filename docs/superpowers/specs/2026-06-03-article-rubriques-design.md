# Rubriques, mots-clés invisibles & recherche — Design

**Date:** 2026-06-03
**Branche:** `feature/article-rubriques`
**Statut:** approuvé (design), à implémenter

## Problème

Aujourd'hui deux mécanismes se chevauchent et sèment la confusion :

- `tags` / `articleTags` : labels thématiques **libres** générés par l'IA (1–4 par
  article, vocabulaire ouvert qui grossit sans limite). Affichés sur la home en
  nuage de chips de filtre et comme pseudo-rubrique sur les cards.
- `articleKeywords` : 5–10 entités précises générées par l'IA, **normalisées**,
  utilisées uniquement par le moteur « à lire aussi » (`src/lib/suggestions.ts`),
  déjà invisibles pour l'utilisateur.

On veut séparer proprement les deux rôles :

1. **Rubriques** : taxonomie **fermée et fixe**, exactement **une par article**,
   servant de navigation principale sur la home (remplace le nuage de tags).
2. **Mots-clés** : restent le moteur de similarité **invisible** (inchangé).
3. **Recherche** : nouvelle recherche plein-texte d'articles.

## Décisions

| Sujet | Choix |
|-------|-------|
| Taxonomie | **Standard 8** rubriques |
| Migration des articles existants | **Heuristique** depuis les tags actuels (sans IA) |
| Recherche | **Full-text Postgres** (tsvector `french`) |
| Visibilité keywords | **Invisibles** (moteur « à lire aussi » uniquement) |

### Taxonomie (8 rubriques)

Valeurs enum (slugs ASCII) → libellés i18n :

| slug | FR | EN |
|------|----|----|
| `france` | France | France |
| `international` | International | World |
| `politique` | Politique | Politics |
| `economie-social` | Économie & social | Economy & Society |
| `ecologie` | Écologie | Environment |
| `sciences-sante` | Sciences & Santé | Science & Health |
| `culture-idees` | Culture & idées | Culture & Ideas |
| `societe` | Société | Society |

Note éditoriale : pas de rubrique *Tech* dédiée en Standard-8 → le numérique/tech
est rangé sous *Sciences & Santé*. Si le volume tech devient important, basculer
vers une taxonomie élargie (décision future, hors scope).

## Architecture

### 1. Modèle de données (`src/db/schema.ts`)

- Nouvel enum `rubricEnum` (`pgEnum`) avec les 8 slugs ci-dessus, même pattern que
  `verdictEnum`. Liste source de vérité dans `src/lib/rubrics.ts` (slugs + ordre
  d'affichage), importée par le schéma comme `FRAMING_VALUES` l'est aujourd'hui.
- Nouvelle colonne `articles.rubric` :
  - étape migration 1 : ajoutée **nullable** ;
  - étape migration 2 : backfill heuristique (voir §5) ;
  - étape migration 3 : passée `NOT NULL`.
  - Index `articles_rubric_idx` sur `(rubric)` pour le filtre home.
- **Suppression** des tables `tags`, `articleTags` et de leurs relations
  (`tagsRelations`, `articleTagsRelations`) + types `Tag`/`NewTag`. Devenues
  redondantes (rubrique = navigation, keywords = similarité).
- `articleKeywords` et sa relation : **inchangés**.
- **FTS** : colonne générée `searchVector` de type `tsvector`, calculée par
  Postgres en `GENERATED ALWAYS AS` sur
  `to_tsvector('french', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,''))`,
  + index GIN `articles_search_vector_idx`.
  - Justification SQL brut (cf. `CLAUDE.md`) : Drizzle ne couvre pas l'expression
    d'une colonne générée `tsvector` ni l'index GIN ; on utilise
    `.generatedAlwaysAs(sql\`…\`)` avec les identifiants de colonnes Drizzle dans
    l'expression autant que possible. Test de non-régression sur la requête de
    recherche (voir §4).

### 2. Pipeline d'analyse IA

- `src/lib/pipeline/schemas.ts` : remplacer la propriété d'outil `tags` (array
  libre) par `rubric` : `string`, `enum` = les 8 slugs, **required**. `keywords`
  reste tel quel. Mettre à jour la description pour forcer un choix unique dans la
  liste fermée.
- `src/lib/pipeline/aggregate.ts` : parser/valider `rubric` (slug ∈ liste, sinon
  fallback `societe`) au lieu de `tags[]`.
- `src/lib/pipeline/run.ts` : écrire `articles.rubric` à la création/maj de
  l'article au lieu d'insérer dans `tags`/`articleTags`. Retirer `colorForTag`,
  `slugify`-pour-tags et la logique d'upsert tags.
- `src/lib/pipeline/diagnostics.ts` : retirer/adapter les métriques liées aux tags
  si présentes ; conserver les métriques keywords.

### 3. Home / navigation

- `src/lib/rubrics.ts` (nouveau) : `RUBRICS` (slugs ordonnés), helper
  `isRubric(value): value is Rubric`, type `Rubric`.
- `src/lib/articles.ts` :
  - `getPublishedArticles({ verdict, rubric })` filtre par `articles.rubric` au
    lieu de `tag` (join sur `articleTags` supprimé).
  - Supprimer `getAllTags`.
  - Les `with: { articleTags: … }` des requêtes → remplacés par la lecture directe
    de `article.rubric`.
- `src/components/feed-filters.tsx` : les chips listent les **8 rubriques**
  (libellés i18n, lien `?rubric=slug`) + on conserve le bloc filtre verdict.
- `src/app/[locale]/(public)/page.tsx` : `searchParams` `tag` → `rubric` ;
  `sectionTitle` résout le libellé rubrique via i18n.
- Cards (`article-card.tsx`, `hero-card.tsx`, `secondary-card.tsx`) : afficher le
  libellé de `article.rubric` au lieu de `articleTags[0].tag.label`.
- Page article publique (`article/[slug]/page.tsx`) et admin
  (`admin/articles/[id]/page.tsx`) : remplacer le bloc tags par la rubrique.

### 4. Recherche plein-texte

- Composant recherche dans `src/components/site-header.tsx` : icône loupe +
  champ → navigue vers `/[locale]/recherche?q=…`.
- Nouvelle page `src/app/[locale]/(public)/recherche/page.tsx` (server) :
  - `getSearchResults(q, locale)` dans `src/lib/articles.ts` (ou
    `src/lib/search.ts`) : requête Drizzle + `sql` minimal pour
    `plainto_tsquery('french', q)` matché contre `searchVector`, rankée par
    `ts_rank`, filtrée `published = true`, `deletedAt is null`, `locale`.
  - Rendu : liste d'`ArticleCard` + état vide « aucun résultat ».
  - Test de non-régression sur la construction de la requête FTS.
- i18n : libellés recherche (`search.placeholder`, `search.empty`, `search.title`).

### 5. Migration des données

Migration Drizzle générée (`db:generate`) en plusieurs temps + script de backfill :

1. `ALTER TABLE articles ADD COLUMN rubric rubric` (nullable) + création de l'enum.
2. Backfill heuristique (script `src/db/backfill-rubrics.local.ts`, Drizzle query
   builder) depuis le premier tag de chaque article :
   - `politics → politique`
   - `environment → ecologie`
   - `health → sciences-sante`
   - `tech → sciences-sante`
   - aucun tag mappable → `societe` (fallback) + `console.warn` de l'id/slug pour
     relecture admin.
3. `ALTER COLUMN rubric SET NOT NULL`.
4. Ajout colonne générée `searchVector` + index GIN.
5. `DROP TABLE article_tags, tags`.
- Seed : `src/db/seed-articles-data.ts` (`TAGS`, `tagSlug`) et
  `src/db/seed-articles.ts` mis à jour pour seeder `rubric` directement.

### 6. i18n

- `messages/fr.json` + `messages/en.json` : namespace `rubrics.<slug>.label`
  (8 entrées) + namespace `search.*`. Mêmes conventions que `verdicts.*`.

## Tests

- `src/lib/rubrics.ts` : `isRubric` accepte les 8 slugs, rejette le reste.
- Recherche : test de non-régression sur la requête FTS (mapping schéma Drizzle,
  pas de noms de tables/colonnes en dur hors expression FTS justifiée).
- Backfill : test du mapping tag→rubrique (table de correspondance pure).
- `pnpm test` + `pnpm build` verts avant PR.

## Hors scope

- Taxonomie élargie (Large-11) et sous-rubriques.
- Mots-clés cliquables / pages sujet (keywords restent invisibles).
- Recherche multi-locale croisée, facettes combinées recherche+rubrique.
- Réorganisation du dashboard admin au-delà du remplacement tags→rubrique.

## Workflow

Branche `feature/article-rubriques` → commits → push → PR (jamais sur `main`).
`pnpm` canonique (pas de `npm install`).
