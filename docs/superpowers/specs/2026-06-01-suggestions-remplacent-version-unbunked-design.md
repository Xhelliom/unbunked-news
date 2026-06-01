# Remplacer "Version Unbunked" par des suggestions d'articles

Date : 2026-06-01
Statut : validé, prêt pour plan d'implémentation

## Contexte et motivation

Aujourd'hui chaque article fact-checké propose un onglet "Version Unbunked" : une
réécriture intégrale de l'article par l'IA, stockée par locale dans
`article_rewrites`. Cette réécriture n'est pas vérifiée. Elle entre en
contradiction avec la mission du produit : valider les sources d'un article et
être un vecteur de confiance. Publier un texte réécrit non vérifié affaiblit
cette promesse.

On supprime donc entièrement la fonctionnalité de réécriture et on la remplace,
au même emplacement sur la page article, par une **suggestion d'articles fiables
traitant du même sujet**. Quand aucun article du même sujet n'existe, on affiche
un message indiquant qu'on travaille dessus et on invite l'utilisateur à
soumettre un article (route `/submit` déjà existante).

Le rapprochement "même sujet" se fait par **mots-clés générés par l'IA au moment
du scan initial** — plus précis que les tags de catégorie larges.

## Objectifs

- Retirer toute trace de la réécriture (DB, pipeline, UI, seeds, i18n).
- Extraire des mots-clés par article au scan et les persister.
- Suggérer jusqu'à 3 articles fiables du même sujet sur la page article.
- Fallback explicite + CTA vers `/submit` quand aucune suggestion.
- `pnpm exec tsc --noEmit` et `pnpm build` verts ; aucun code mort.

## Hors périmètre

- Pas d'embeddings ni de recherche sémantique vectorielle.
- Pas de page dédiée par mot-clé (table keywords partagée/réutilisable rejetée).
- Pas de recalcul automatique des articles existants (un rescan les peuplera).
- Pas de saisie manuelle des mots-clés par l'admin.

## Partie A — Suppression de la réécriture

À supprimer entièrement :

- **DB** : table `article_rewrites`, la relation `rewrites` sur `articlesRelations`,
  `articleRewritesRelations`, les types `ArticleRewrite` / `NewArticleRewrite`.
  Migration drizzle générée (`pnpm db:generate`) contenant le `DROP TABLE`.
- **Pipeline** : `src/lib/pipeline/rewrite.ts` ; `recordRewriteTool` et le type
  `Rewrite` dans `src/lib/pipeline/schemas.ts` ; l'étape `rewriting`
  (appel `rewriteArticle`, insert `articleRewrites`) dans `src/lib/pipeline/run.ts`.
  Réajuster les pourcentages de progression des étapes restantes.
- **UI publique** : `src/components/article-view-switcher.tsx`,
  `src/components/rewrite-body.tsx` ; le bloc `view === "unbunked"`, le switcher,
  le calcul `rewrite` / `rewriteIsFallback`, le type `View` et le param
  `searchParams.view` dans `src/app/[locale]/(public)/article/[slug]/page.tsx`.
  La page devient mono-vue (analyse seule).
- **UI admin** : `src/components/admin/rewrite-form.tsx` ; l'action `saveRewrite`
  dans `src/app/[locale]/admin/actions.ts` ; le bloc rewrites et l'usage de
  `RewriteForm` / `rewrites` dans `src/app/[locale]/admin/articles/[id]/page.tsx`.
- **Lecture** : retirer `rewrites: true` du `with` de `loadArticleBySlug` dans
  `src/lib/articles.ts`.
- **Seeds** : `src/db/seed-articles-rewrites.ts`,
  `src/db/seed-articles-rewrites.local.ts`, et toutes les références (`REWRITES`,
  inserts `articleRewrites`) dans `src/db/seed-articles.ts`,
  `seed-articles-local.ts`, `seed-articles-data.ts`.
- **i18n** : clés `article.views.*`, `article.unbunkedRewrite.*` et les clés
  `rewrites.*` du namespace admin, dans `messages/fr.json` ET `messages/en.json`
  (les deux dans le même commit).

Vérifier après coup qu'aucune référence résiduelle ne subsiste :
`grep -rni "rewrite\|unbunkedRewrite\|articleRewrites\|view=unbunked"` ne doit
remonter que de l'historique git, pas du code vivant.

## Partie B — Mots-clés générés au scan

### Outil IA

`recordAnalysisTool` (dans `src/lib/pipeline/schemas.ts`) gagne une propriété
`keywords`, requise, à côté de `tags` :

```
keywords: {
  type: "array",
  description: "5-10 specific keywords identifying the precise subject of the
    article (named entities, places, people, organisations, specific events).
    NOT broad categories — those are the tags. Same language as the article.",
  items: { type: "string" },
}
```

Ajouter `"keywords"` à la liste `required` de l'outil. Le type `Analysis`
(même fichier) gagne `keywords: string[]`. `aggregate()` lit
`input.keywords` avec le même filtrage défensif que `tags`
(`Array.isArray(...) ? filter(typeof === "string") : []`).

### Persistance

Nouvelle table dans `src/db/schema.ts` :

```
export const articleKeywords = pgTable(
  "article_keywords",
  {
    articleId: uuid().notNull().references(() => articles.id, { onDelete: "cascade" }),
    keyword: text().notNull(), // normalisé : slugify(label)
  },
  (table) => [
    primaryKey({ columns: [table.articleId, table.keyword] }),
    index("article_keywords_keyword_idx").on(table.keyword),
  ],
);
```

Relation `keywords: many(articleKeywords)` sur `articlesRelations`, et la
relation inverse `articleKeywordsRelations` vers `articles`. Types
`ArticleKeyword` / `NewArticleKeyword` exportés. Même migration que le
`DROP TABLE article_rewrites`.

Normalisation : réutiliser la fonction `slugify` existante de
`src/lib/pipeline/run.ts` (déjà utilisée pour les tags) afin que la casse et les
accents ne bloquent pas le matching. On déduplique par article avant insert.

### Insertion

Dans la transaction de `runPipeline` (`src/lib/pipeline/run.ts`), après les tags,
insérer les keywords normalisés/dédupliqués :

```
if (analysis.keywords.length > 0) {
  const rows = [...new Set(analysis.keywords.map(slugify))]
    .filter(Boolean)
    .map((keyword) => ({ articleId: created.id, keyword }));
  if (rows.length > 0) {
    await tx.insert(articleKeywords).values(rows).onConflictDoNothing();
  }
}
```

## Partie C — Suggestions sur la page article

### Requête

Nouveau module `src/lib/suggestions.ts` (`server-only`), fonction
`getSuggestedArticles(articleId: string)` :

- Récupère les keywords de l'article courant.
- Si aucun keyword → retourne `[]` (déclenche le fallback côté UI).
- Sinon : cherche les autres articles publiés partageant ≥1 keyword,
  avec `verdict ∈ {reliable, nuanced}`, en excluant l'article courant ;
  classés par (nombre de mots-clés communs décroissant, `reliabilityScore`
  décroissant) ; **limite 3**.
- Renvoie **la même shape que `getPublishedArticles`** (`with: { articleTags:
  { with: { tag: true } }, claims: { columns: { status: true } } }`) afin que
  le composant `ArticleCard` existant soit réutilisé tel quel.
- Mis en cache via `unstable_cache`, clé `["suggested-articles"]`, tag
  `ARTICLES_CACHE_TAG`, `revalidate` aligné sur les autres lectures publiques.
  Une publication/mutation admin invalide donc aussi les suggestions.

Approche d'implémentation de la requête : un premier select sur
`article_keywords` (keyword IN (...), articleId != courant) groupé par
`articleId` avec `count(*)` comme score de chevauchement ; puis un
`db.query.articles.findMany` filtré sur ces ids + `published` + verdict, avec le
`with`. Le tri final (chevauchement puis score) et le `limit 3` sont appliqués
en JS sur l'ensemble (volume faible, ≤ MAX_FEED_ARTICLES). Pas de N+1 : une
requête d'agrégation + une requête d'articles.

### Composant

Nouveau `src/components/article-suggestions.tsx` (server component) :

- Props : `articles` (résultat de `getSuggestedArticles`).
- Si `articles.length > 0` : un titre de section (i18n `article.suggestions.title`)
  + une grille (`sm:grid-cols-2 lg:grid-cols-3`) de `ArticleCard`.
- Si `articles.length === 0` (**fallback**) : encart avec
  `article.suggestions.fallbackTitle` + `article.suggestions.fallbackBody`
  ("on travaille sur le sujet") et un `Button asChild`/`Link` vers `/submit`
  (`article.suggestions.cta`). Le lien interne passe par `@/i18n/navigation`.

### Intégration page

Dans `src/app/[locale]/(public)/article/[slug]/page.tsx` :

- Supprimer le switcher, le type `View`, le param `view`, les calculs `rewrite`.
- Appeler `getSuggestedArticles(article.id)` et rendre `<ArticleSuggestions>` en
  bas de la page (emplacement de l'ancienne section unbunked), après les
  sections d'analyse / claims.

## Partie D — i18n

Ajouter dans `messages/fr.json` et `messages/en.json` (même commit) :

```
article.suggestions.title          // "Sur le même sujet" / "On the same topic"
article.suggestions.fallbackTitle  // titre de l'encart fallback
article.suggestions.fallbackBody   // "On travaille à couvrir ce sujet…"
article.suggestions.cta            // "Proposer un article" / "Submit an article"
```

Supprimer les clés devenues mortes (`article.views.*`,
`article.unbunkedRewrite.*`, admin `rewrites.*`).

## Comportements limites / décisions

- **Articles pré-existants sans keywords** : `getSuggestedArticles` renvoie `[]`,
  donc fallback "on y travaille". Acceptable ; un rescan les peuple.
- **Article courant `unverifiable`** : sans incidence — on filtre les
  *candidats* sur reliable/nuanced, pas l'article courant.
- **Moins de 3 candidats** : on affiche ce qu'on a (1 ou 2 cartes), pas de
  remplissage.
- **Normalisation** : `slugify` partagé entre insertion et matching garantit la
  cohérence casse/accents.

## Critères d'acceptation

- `pnpm exec tsc --noEmit` vert, `pnpm build` vert.
- Migration générée appliquée : `article_rewrites` droppée, `article_keywords`
  créée avec ses index.
- Plus aucune référence vivante à la réécriture (grep propre).
- Un nouvel article scanné enregistre ses keywords.
- Une page article avec candidats affiche jusqu'à 3 `ArticleCard` fiables du
  même sujet ; sans candidat, l'encart fallback + CTA `/submit` s'affiche.
- `fr.json` et `en.json` synchronisés (pas d'erreur de clé manquante au build).
