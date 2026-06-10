# Assets README — images à créer

Ce dossier contient les images référencées dans le README racine.
Toutes sont des placeholders — les créer et remplacer les fichiers.

---

## Banners (obligatoires)

| Fichier | Dimensions | Notes |
|---------|-----------|-------|
| `banner-dark.png` | 1280 × 400 px | Fond sombre (#0f0f0f ou #111827), logo centré, tagline blanche |
| `banner-light.png` | 1280 × 400 px | Fond clair (#ffffff ou #f9fafb), logo sombre, tagline #1f2937 |

GitHub affiche automatiquement le bon banner selon le thème de l'utilisateur
grâce aux fragments `#gh-dark-mode-only` / `#gh-light-mode-only`.

Outils suggérés : Figma, Canva.

---

## Screenshots (obligatoires)

| Fichier | Page | Notes |
|---------|------|-------|
| `screenshot-feed.png` | `/` | Feed public avec 3+ cartes articles |
| `screenshot-article.png` | `/article/[slug]` | Page article avec claims surlignées dans le texte |
| `screenshot-claim.png` | `/article/[slug]` | Zoom sur une fiche claim ouverte (verdict + sources) |
| `screenshot-admin.png` | `/admin` | Vue admin — révision d'un brouillon |

Dimensions recommandées : **1200 × 750 px**, format PNG ou WebP.
Capturer en thème sombre pour contraster avec le fond blanc GitHub.

---

## GIF demo (optionnel mais très impactant)

| Fichier | Contenu |
|---------|---------|
| `demo.gif` | Pipeline complète : soumettre une URL → voir le job progresser → verdict publié |

Durée idéale : 15-20 secondes, en boucle.
Outils : LICEcap (macOS/Windows), Peek (Linux), ou Kap (macOS).
Taille max recommandée : 5 MB (GitHub affiche les GIFs inline jusqu'à ~10 MB).

Pour l'intégrer dans le README, ajouter après la section "Comment ça marche" :

```markdown
<div align="center">
  <img src="docs/demo.gif" alt="Démonstration de la pipeline" width="80%" />
</div>
```
