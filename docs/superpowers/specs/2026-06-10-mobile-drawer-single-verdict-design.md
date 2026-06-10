# Drawer mobile — une vérification à la fois

**Date :** 2026-06-10
**Branche :** `feature/echelle-verdicts`
**Statut :** validé, prêt pour plan d'implémentation

## Problème

Sur mobile, la vérification Unbunked vit dans un drawer bas. Quand un paragraphe
contient deux claims (ou plus) de verdicts différents, le drawer affiche
aujourd'hui les **chips de tous les verdicts en même temps** (ex. « Fiable » et
« Imprécis » côte à côte). On lit deux verdicts contradictoires d'un coup sans
comprendre lequel s'applique. Techniquement le scroll sélectionne le bon claim
(le chip correspondant s'active quand on défile plus bas dans le paragraphe),
mais ce n'est pas intuitif.

Le desktop n'a pas ce problème : le panneau latéral montre **une seule**
vérification à la fois, donc la lecture est claire.

## Objectif

Aligner le mobile sur le desktop : le drawer n'affiche **qu'une seule
vérification à la fois** — le claim actif au scroll. Quand un paragraphe a
plusieurs claims, une navigation explicite (chevrons + compteur) permet de
passer de l'un à l'autre.

Non-objectif : retoucher la barre latérale dégradée des paragraphes (elle reste
un dégradé multi-verdicts, sur mobile comme desktop), le rail, ou le panneau
desktop.

## Comportement retenu

1. **Une vérif visible.** Le drawer ne montre que le claim actif. Plus jamais
   deux verdicts affichés simultanément.
2. **Navigation multi-claims.** Sur un paragraphe à 2+ claims, le header du
   drawer affiche, à droite du badge de verdict, une commande
   `‹ position/total ›` (ex. `‹ 1/2 ›`). Les chevrons sont désactivés aux
   extrémités (pas de précédent sur `1/2`, pas de suivant sur `2/2` — pas de
   wrap).
3. **Tap chevron.** Sélectionne le claim cible **et** fait défiler en douceur
   son highlight au centre du viewport (même comportement qu'un tap sur un point
   du rail). Article, drawer et rail restent synchrones. Le snap du drawer
   (peek / expanded) **ne change pas** : naviguer ne replie ni ne déploie le
   drawer.
4. **Paragraphe à 1 claim.** Header classique inchangé : badge de verdict à
   gauche, label « vérification » à droite, pas de chevrons.
5. **Handle (barre colorée du drawer) + neon glow.** Couleur **solide du verdict
   actif**, qui change quand on navigue d'un claim à l'autre. On abandonne le
   dégradé multi-verdicts sur le handle : le compteur `1/2` porte désormais le
   signal « plusieurs verdicts dans ce paragraphe ».

## Changements

### `src/components/article-reader/mobile-claim-drawer.tsx`

- Supprimer le bloc de chips multi-claims (rangée de boutons verdict).
- Le drawer possède sa propre rangée header :
  - Gauche : `ClaimStatusBadge` du claim affiché.
  - Droite : si le groupe a >1 claim → commande de navigation
    `‹ position/total ›` ; sinon → `verificationLabel` (comme aujourd'hui pour
    le cas single).
- `ClaimCard` est rendu **toujours** `frameless` + `hideHeader` : le header est
  désormais porté par le drawer dans tous les cas (avant, `hideHeader` n'était
  vrai qu'en multi-claims).
- Handle + neon glow : couleur solide dérivée du verdict du claim affiché
  (`claims[selectedIndex].status`). Retirer la boucle qui construisait le
  dégradé à partir de `groupIndices`.
- Props : remplacer `onSelectIndex` par `onNavigate(index: number)`. Conserver
  `groupIndices` et `selectedIndex` pour calculer `position`
  (`groupIndices.indexOf(selectedIndex) + 1`) et `total` (`groupIndices.length`)
  et déterminer les index précédent/suivant.

### `src/components/article-reader/index.tsx`

- Nouveau handler `navigateToClaimInGroup(index: number)` :
  - `setTappedClaim(index)`,
  - fait défiler le highlight du claim au centre
    (`querySelector('[data-claim-index="…"]').scrollIntoView({ behavior: "smooth", block: "center" })`),
  - **ne touche pas** à `expandedForGroupKey` (le snap est préservé).
- Brancher ce handler sur la prop `onNavigate` du `MobileClaimDrawer`.
- `drawerSelectedIndex` reste inchangé (l'override `tappedClaim` est déjà en
  place et garde la sélection stable tant que le paragraphe reste actif).
- `selectClaimInDrawer` (qui ne servait qu'aux chips) est supprimé s'il n'a plus
  d'usage.

## Découpage / interfaces

- `MobileClaimDrawer` reste l'unité d'affichage : reçoit le claim à montrer, le
  groupe, et un callback de navigation. Ne connaît rien du scroll ni du modèle
  de lecture.
- `ArticleReader` (`index.tsx`) reste l'orchestrateur : il possède l'état
  (`tappedClaim`, `expandedForGroupKey`), traduit la navigation en
  sélection + scroll, et garde la synchro scroll/rail/drawer.

## Critères de réussite

- Sur un paragraphe à un seul claim : aucun changement visible.
- Sur un paragraphe à plusieurs claims : le drawer ne montre qu'un verdict ;
  `‹ pos/total ›` apparaît ; les chevrons naviguent et scrollent le highlight ;
  le handle prend la couleur du verdict affiché.
- Le snap du drawer ne change pas quand on navigue entre claims.
- `pnpm exec tsc --noEmit` et `pnpm build` verts. `fr.json` / `en.json` à jour
  si une nouvelle clé (ex. label aria précédent/suivant) est introduite.
