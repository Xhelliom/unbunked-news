# Propositions créatives d'amélioration — Unbunked

> Date : 2026-06-09. Huit pistes classées par rapport valeur/effort, chacune esquissée
> avec la stack existante (Next 16, Drizzle/PG 16, pipeline Claude, Resend/SMTP, i18n fr/en).
> Recommandation : commencer par le **top 3** (§1–§3), qui réutilise massivement l'existant.

---

## 1. 🏆 Observatoire des sources

**Concept.** Une page publique `/sources` qui classe les domaines de presse par fiabilité
*observée* : moyenne des scores, distribution des verdicts, nombre d'articles analysés,
tendance dans le temps. Chaque domaine a sa fiche (`/sources/lemonde.fr`) listant ses
articles analysés.

**Pourquoi c'est fort.** Toutes les données existent déjà (`articles.urlOrigine` + scores
+ verdicts) ; personne d'autre ne publie un index de fiabilité *fondé sur des
vérifications réelles claim par claim* plutôt que sur des panels d'experts. C'est l'actif
éditorial qui se bonifie tout seul : chaque article analysé enrichit l'observatoire.

**Esquisse.** Une requête Drizzle agrégée (`GROUP BY` hostname extrait à l'insertion dans
une colonne `source_domain` indexée), un composant de classement réutilisant
`verdict-badge` et les tokens `--verdict-*`. Garde-fou : n'afficher un domaine qu'à
partir de N ≥ 5 articles pour éviter les classements sur un seul papier.

**Effort : faible (2-3 jours).** Aucune dépendance nouvelle.

---

## 2. 🏆 Mémoire des affirmations (claims croisés)

**Concept.** Les mêmes infox circulent d'article en article. Dédupliquer sémantiquement
les claims entre articles : une page par affirmation (« vue dans 7 articles, verdict
stable : faux »), un encart « cette affirmation a déjà été vérifiée » dans le lecteur,
et surtout la **réutilisation des vérifications passées dans le pipeline** — si un claim
quasi identique a déjà été vérifié récemment, on injecte le verdict précédent comme
évidence au lieu de relancer une recherche web complète.

**Pourquoi c'est fort.** Triple gain : produit (navigation par affirmation, très
partageable), coût (moins d'appels web-search Anthropic — le poste le plus cher du
pipeline), cohérence (deux articles ne reçoivent plus deux verdicts contradictoires sur
le même claim).

**Esquisse.** `pgvector` sur PG 16 + une colonne `embedding` sur `claims` (embeddings via
l'API au moment de l'extraction). Similarité cosinus > seuil → lien vers un
`claim_clusters`. Le connecteur s'insère naturellement dans
`src/lib/pipeline/data-sources.ts`, qui a déjà l'interface « évidence externe avec
dégradation gracieuse » — la vérification interne devient une source d'évidence comme
ClaimReview.

**Effort : moyen (1-2 semaines).** Une extension PG, une migration, un connecteur.

---

## 3. 🏆 Score embarquable : badges SVG + cartes sociales dynamiques

**Concept.** Un endpoint `GET /api/badge/[slug].svg` (badge « Unbunked : 72/100 —
fiable ») que n'importe quel site/forum peut embarquer, et des images OpenGraph générées
par article (`next/og`) montrant le score, le verdict et le claim le plus marquant.

**Pourquoi c'est fort.** Chaque partage d'article devient une publicité du score ; le
badge crée des backlinks et installe le réflexe « vérifié par Unbunked ». Coût quasi nul.

**Esquisse.** Route handler retournant un SVG statique (cache long, revalidation à la
republication) ; `ImageResponse` de `next/og` pour les cartes, avec les tokens du design
system. Attention règle §16 : le slug est le seul input — pas d'injection possible.

**Effort : faible (1-2 jours).**

---

## 4. Re-vérification programmée des claims périssables

**Concept.** Un verdict n'est pas éternel : un claim `unverifiable` peut devenir
vérifiable, un chiffre devient obsolète. Marquer les claims sensibles au temps (le modèle
le juge déjà implicitement via `recency`), et re-passer la phase `verify` après N jours.
Afficher une **timeline de verdict** sur la page claim (« unverifiable en mars → false en
mai »).

**Pourquoi c'est fort.** Aucun fact-checker ne montre l'évolution d'un verdict ; c'est un
argument de transparence majeur et parfaitement aligné avec l'« evidence snapshot » déjà
persisté (colonne `evidence`).

**Esquisse.** Un champ `recheck_after` sur `claims`, un job périodique réutilisant la
file `jobs` existante et la phase `verify` seule (un appel = un but, règle §11), une
table `claim_verdict_history`. Le coût est borné : on ne re-vérifie que les claims
marqués, pas l'article entier.

**Effort : moyen (≈1 semaine).**

---

## 5. Digest hebdomadaire bilingue

**Concept.** Une newsletter générée automatiquement chaque semaine : articles analysés,
claim le plus viral, source la plus/moins fiable de la semaine (synergie avec §1),
en FR et EN selon la préférence du compte.

**Esquisse.** L'infra email existe (Resend + SMTP), les comptes utilisateurs aussi. Une
phase de génération Claude (résumé éditorial du digest — un appel, un but), un template
React Email, une table `newsletter_subscriptions` avec double opt-in. Cron via le worker
existant.

**Effort : moyen (≈1 semaine).** Rétention + canal de retour direct vers le site.

---

## 6. Bookmarklet / extension « Unbunk this »

**Concept.** Soumettre l'article qu'on est en train de lire en un clic. MVP : un
bookmarklet (`javascript:location='https://unbunked.../submit?url='+encodeURIComponent(location.href)`)
— zéro code d'extension. V2 : WebExtension qui affiche aussi le badge §3 si l'article a
déjà été analysé (lookup par URL canonique).

**Esquisse.** La route `/submit` et la modération des propositions existent déjà ; il
manque seulement le pré-remplissage par query param (valider l'URL avec `safeHttpUrl`,
règle §16). La V2 ajoute un endpoint public `GET /api/lookup?url=` (rate-limité —
l'infra de rate-limit des contributions existe déjà).

**Effort : très faible (MVP : quelques heures) ; extension : moyen.**

---

## 7. Réputation des contributeurs

**Concept.** Les contributions par claim existent (avec modération). Ajouter une boucle
de motivation : contribution acceptée → points ; paliers (« observateur », « enquêteur »,
« vigie ») affichés sur le profil ; les contributions des rangs élevés remontent en haut
de la file de modération.

**Esquisse.** Une colonne `reputation` sur l'utilisateur, incrémentée en transaction au
moment de l'acceptation (règle §10 : une action utilisateur = une transaction), seuils en
constantes nommées, badges i18n. Pas de leaderboard public au départ (évite le spam de
contributions opportunistes).

**Effort : faible (2-3 jours).**

---

## 8. API publique + flux RSS des analyses

**Concept.** `GET /api/v1/articles`, `GET /api/v1/articles/[slug]` (score, verdict,
claims, sources) + `/feed.xml`. Cible : chercheurs, journalistes, agrégateurs — et le
flux RSS ramène les lecteurs réguliers.

**Esquisse.** Route handlers en lecture seule sur les requêtes publiques existantes
(`src/lib/articles.ts`), clé API simple en header pour le JSON (table `api_keys`),
RSS sans auth. Versionner dès le départ (`/v1/`) pour pouvoir évoluer.

**Effort : faible-moyen (3-4 jours).**

---

## Matrice récap

| # | Proposition | Valeur | Effort | Dépendances nouvelles |
|---|---|---|---|---|
| 1 | Observatoire des sources | ★★★★★ | Faible | — |
| 2 | Mémoire des affirmations | ★★★★★ | Moyen | pgvector |
| 3 | Badges + OG dynamiques | ★★★★ | Faible | — |
| 4 | Re-vérification programmée | ★★★★ | Moyen | — |
| 5 | Digest hebdo | ★★★ | Moyen | template email |
| 6 | Bookmarklet « Unbunk this » | ★★★ | Très faible | — |
| 7 | Réputation contributeurs | ★★★ | Faible | — |
| 8 | API publique + RSS | ★★★ | Faible-moyen | — |

**Séquence suggérée.** §6 (quelques heures) et §3 ouvrent la boucle d'acquisition ;
§1 crée l'actif éditorial différenciant ; §2 est l'investissement structurel qui réduit
les coûts du pipeline tout en ouvrant la navigation par claim — et §4 s'appuie dessus.
