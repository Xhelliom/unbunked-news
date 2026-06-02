# Règles SQL / Drizzle

## Requêtes base de données

- Toujours privilégier le query builder Drizzle (`db.select`, `db.insert`, `db.update`, `db.delete`, CTE via `db.$with`) au lieu du SQL brut.
- Interdiction d’écrire des noms de tables/colonnes PostgreSQL en dur dans des chaînes SQL (ex: `analytics_events`, `visitor_hash`, `created_at`) sauf contrainte technique documentée.
- `db.execute(sql\`...\`)` n’est autorisé qu’en dernier recours (fonction SQL non couverte par Drizzle) et doit inclure :
  - une justification en commentaire dans le code,
  - l’usage des objets de schéma Drizzle pour les identifiants dès que possible,
  - un test de non-régression pour la requête concernée.
- Avant toute nouvelle requête analytics, vérifier que le mapping suit le schéma Drizzle du projet et non une convention SQL supposée.
