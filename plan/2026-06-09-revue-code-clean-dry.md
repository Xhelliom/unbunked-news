# Revue de code — clean code & DRY

> Date : 2026-06-09 · Périmètre : `src/` complet (213 fichiers), règles de référence : `AGENTS.md`.
> Chaque constat a été vérifié dans le code (fichier:ligne). Aucun correctif appliqué — ce document est le plan de remédiation.

## Synthèse

Le codebase est globalement très sain : aucun `any` ni `@ts-ignore`, parité i18n parfaite
(571 clés FR = 571 clés EN), pas de N+1, index présents sur les chemins chauds, validation
des tool calls Claude systématique, `pause_turn` et `cache_control` correctement gérés,
aucune couleur en dur, `useActionState` partout. Les violations trouvées sont concentrées
sur **trois zones** : deux fichiers au-dessus du plafond de 500 lignes, une frontière
`server-only` documentée mais non appliquée, et de la duplication dans les formulaires
d'auth et les actions admin.

---

## 1. Sévérité haute

### 1.1 `src/lib/scrape.ts` — 599 lignes (plafond dur : 500)

Le fichier mélange trois concepts : parsing HTML en blocs, transport HTTP/rendu headless,
et orchestration du scraping. Découpage proposé (règle §2) :

| Nouveau module | Contenu |
|---|---|
| `src/lib/scrape.ts` (conservé) | Types publics (`ScrapedArticle`, `ScrapeResult`, …) + `scrapeArticle()` orchestrateur |
| `src/lib/scrape-fetch.ts` | `fetchHtml()`, `renderHtml()`, `decodeHtml()` (transport + charset) |
| `src/lib/scrape-blocks.ts` | `htmlToBlocks()`, `buildStructureCandidates()`, `applyStructureSelection()` + helpers de filtrage |

### 1.2 `src/app/[locale]/admin/actions.ts` — 590 lignes (plafond dur : 500)

16 server actions dans un seul fichier, avec trois blocs de validation dupliqués :

- **Comptage minimum d'admins** avant rétrogradation/suppression : lignes ~278-286, ~393-401, ~578-586 (3×) → extraire `assertNotLastAdmin()`.
- **Unicité d'email** : lignes ~319-325, ~383-389, ~502-512 (3×) → extraire `assertEmailAvailable()`.
- **Synchronisation `account.accountId`** au changement d'email : 2× (~410-415, ~522-535).

Découpage proposé, par domaine (règle §2 « one concept per file ») :

| Fichier | Actions |
|---|---|
| `admin/member-actions.ts` | createMember, updateMember, deleteMember, setMemberPassword, setMemberAdminStatus |
| `admin/article-actions.ts` | saveArticle, saveRewrite, setPublished, setDeleted, restoreArticle, relaunchArticle |
| `admin/proposal-actions.ts` | acceptProposal, rejectProposal |
| `admin/action-helpers.ts` | assertNotLastAdmin, assertEmailAvailable, constantes d'erreur partagées |

### 1.3 Frontière `server-only` contournée sur la DB

`src/db/index.ts` est l'entrée protégée (`import "server-only"`) documentée comme
« entry point for application code »… mais **aucun fichier ne l'importe**. Les 27 modules
applicatifs (actions, pages, `src/lib/*`) importent tous `@/db/client` directement, qui
n'a pas de garde. Le garde-fou existe donc sur un module mort.

Contrainte à respecter : les scripts CLI (`db:seed-admin`, backfills, exécutés via `tsx`)
importent `client.ts` volontairement sans garde — c'est pour ça qu'il n'en a pas.
`db:rescore-local` montre déjà la solution : `node --conditions=react-server` rend
`server-only` inoffensif côté script.

Remédiation (au choix, la première est la moins invasive) :

1. **Règle ESLint `no-restricted-imports`** interdisant `@/db/client` hors de `src/db/`
   et des scripts, en forçant `@/db` partout ailleurs ; ou
2. ajouter `import "server-only"` à `client.ts` et passer tous les scripts CLI en
   `--conditions=react-server` (comme `db:rescore-local`).

### 1.4 `CLAIM_STATUSES` dupliqué — violation littérale de la règle §4

La règle cite précisément cet exemple comme interdit, et il existe pourtant en double :

- `src/lib/pipeline/schemas.ts:27-33` (source déclarée par la règle)
- `src/lib/claim-status.ts:5-11` (copie côté UI, avec un commentaire « kept in sync »)

Un commentaire « kept in sync » est exactement la dérive que la règle veut empêcher.
Remédiation : extraire la liste dans un module feuille sans dépendance serveur
(p. ex. `src/lib/pipeline/claim-statuses.ts`) importé par `schemas.ts` **et**
`claim-status.ts` — un import direct de `schemas.ts` depuis l'UI tirerait des
dépendances pipeline dans le bundle client.

### 1.5 Validation d'ID manquante dans les actions admin

`setPublished` (actions.ts:169-179), `setDeleted` (:184-193), `restoreArticle` (:196-205)
et `saveRewrite` (:140-167, `articleId`) exécutent l'UPDATE même si l'id du FormData est
vide (`WHERE id = ""`). Sans gravité directe (aucune ligne ne matche) mais contraire à la
règle §16 « re-validate every server-action input » — `acceptProposal` (:240-244) montre
le bon pattern. Ajouter le même early-return sur id vide.

---

## 2. Sévérité moyenne

### 2.1 `MIN_PASSWORD_LENGTH = 8` défini 4 fois

- `src/components/auth/reset-password-form.tsx:12`
- `src/components/auth/signup-form.tsx:13`
- `src/components/profile/change-password-form.tsx:10`
- `src/app/[locale]/admin/actions.ts:76`

4 occurrences = bien au-dessus du seuil d'extraction (règle §3). Créer
`src/lib/auth-constants.ts` (module feuille importable côté client et serveur).

### 2.2 Constantes d'erreur dupliquées actions ↔ pages

- `MEMBER_ERROR` (`admin/actions.ts:42-53`) vs `MEMBER_ERROR_KEYS` (`admin/members/page.tsx:16-27`)
- `ACCOUNT_ERROR` (`admin/actions.ts:61-67`) vs `ACCOUNT_ERROR_KEYS` (`admin/account/page.tsx:15-21`)

Si un code change côté action, la page ne suit pas. À regrouper dans le futur
`admin/action-helpers.ts` (cf. 1.2).

### 2.3 Duplication dans les formulaires d'auth (4 fichiers)

`admin/login-form.tsx`, `auth/forgot-password-form.tsx`, `auth/reset-password-form.tsx`,
`auth/signup-form.tsx` partagent à l'identique :

- le `className` du bouton submit (163 caractères, 4×) — login-form.tsx:140, forgot-password-form.tsx:84, reset-password-form.tsx:118, signup-form.tsx:151 ;
- le bouton « œil » de visibilité du mot de passe (3×) — login-form.tsx:111-118, reset-password-form.tsx:87-94, signup-form.tsx:134-141 ;
- le heading `text-[1.85rem] …` (4×).

`auth-shell.tsx` exporte déjà `AUTH_INPUT_CLASS` : y ajouter `AUTH_SUBMIT_BUTTON_CLASS`,
`AUTH_HEADING_CLASS`, et un composant `<PasswordInput>` encapsulant le toggle.

### 2.4 Page article — 401 lignes (soft cap : 250)

`src/app/[locale]/(public)/article/[slug]/page.tsx`. Extractions naturelles vers
`src/components/` : bloc métadonnées + score (~138-260), vue analyse (~268-337),
vue réécriture (~340-387).

### 2.5 `useMemo` pass-through

`src/components/admin/member-management-client.tsx:154` :
`const orderedMembers = useMemo(() => members, [members]);` — aucun calcul, aucune
mesure (règle §17). Supprimer et utiliser `members` directement.

### 2.6 Doublon `CLAUDE.md` / `claude.md` à la racine

`CLAUDE.md` (→ `@AGENTS.md`) et `claude.md` (règles SQL/Drizzle en français) coexistent.
Sur un système insensible à la casse un seul des deux survit, et les règles SQL de
`claude.md` ne sont vraisemblablement jamais chargées. Fusionner son contenu dans
`AGENTS.md` (section 10) et supprimer `claude.md`.

---

## 3. Mineur / à surveiller

- **`pricing.ts` sans `server-only`** : importé uniquement par un module déjà gardé, mais
  un `import "server-only"` défensif est gratuit (règle §10).
- **Duplication pipeline sous le seuil** : formatage `sourceList` et construction du
  message Anthropic identiques 2× (`aggregate.ts:115-150`, `assess-claims.ts:113-148`).
  Règle §3 : on laisse à 2 occurrences — extraire à la 3ᵉ phase qui en aura besoin.
- **`gatherExternalEvidence` appelé deux fois** (aggregate puis assess-claims) : vérifié,
  amorti par le cache TTL interne de `data-sources.ts` (`cached()`), donc acceptable —
  un commentaire le disant éviterait la fausse alerte à la prochaine revue.
- **`saveArticle` ne trim pas** title/summary contrairement à `createMember` — harmoniser.
- **Re-throw dans `article/[slug]/actions.ts:51`** : `requireUserId()` re-jette les
  erreurs inattendues vers l'arbre React, là où la règle §12 demande un état d'erreur
  typé. À trancher : soit assumer (erreur « impossible »), soit retourner un état d'erreur.

---

## 4. Ce qui est exemplaire (à préserver)

- Zéro `any`, zéro `@ts-ignore`/`@ts-expect-error`, `eslint-disable` toujours justifiés.
- i18n : parité stricte fr/en (571 clés), ICU partout.
- Pipeline IA : un appel = un but, tool calls forcés, parsing défensif (`toClaims`,
  `toCriteria`), `pause_turn` borné (`MAX_SEARCH_ROUNDS`), coûts suivis.
- DB : pas de N+1 (batch `inArray`), index sur tous les FK chauds, transactions sur les
  actions composées.
- Constantes temporelles toutes suffixées `_MS` ; pas de gros entiers opaques.
- Aucune couleur en dur, tokens `--verdict-*` partout ; kebab-case 100 % respecté.

## 5. Ordre de remédiation conseillé

1. Frontière `server-only` (1.3) — risque sécurité, correctif d'une ligne ESLint.
2. Split `admin/actions.ts` (1.2) + helpers + constantes d'erreur (2.2) — même chantier.
3. Split `scrape.ts` (1.1).
4. `CLAIM_STATUSES` source unique (1.4) et `MIN_PASSWORD_LENGTH` partagé (2.1).
5. Validation d'ID des actions (1.5) — rapide.
6. Factorisation auth forms (2.3) et page article (2.4).
7. Nettoyages mineurs (§3) au fil de l'eau, dans les PR qui touchent ces fichiers.

Chaque étape doit rester une PR isolée (règle §19 : un changement logique par commit,
refactor ≠ feature).
