# Unbunked News

Plateforme de fact-checking : on soumet l'URL d'un article, une pipeline IA
(Claude + recherche web) extrait les affirmations vérifiables, les vérifie une
à une avec de vraies sources, puis produit un verdict, un score de fiabilité,
une analyse claim par claim, et une **réécriture multilingue** de l'article.
Le tout est publié sur un front public façon site d'actualité, bilingue
(FR/EN) avec thème clair/sombre.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Tailwind CSS v4** + shadcn/ui · thème clair/sombre
- **next-intl** — internationalisation FR/EN
- **Drizzle ORM** + **PostgreSQL 16**
- **BetterAuth** — authentification admin (email/mot de passe)
- **Anthropic SDK** (Claude) + web search tool
- Scraping : `@extractus/article-extractor` avec repli Puppeteer
- Conteneurisation **Docker Compose** / manifests **Kubernetes**

## Prérequis

- Node.js 20+
- pnpm
- Docker (pour PostgreSQL en local)
- Une clé API Anthropic (`ANTHROPIC_API_KEY`)

---

## Démarrage rapide (développement local)

```bash
# 1. Dépendances
pnpm install

# 2. Variables d'environnement
cp .env.example .env
```

Ouvre `.env` et renseigne au minimum :

| Variable | Valeur |
|---|---|
| `ANTHROPIC_API_KEY` | ta clé API Anthropic |
| `BETTER_AUTH_SECRET` | `$(openssl rand -base64 32)` |

```bash
# 3. Lancer Postgres + appliquer les migrations
docker compose up -d db
pnpm db:migrate

# 4. Créer le premier compte admin
pnpm db:seed-admin "toi@exemple.com" "un-mot-de-passe-fort"
# ou sans mot de passe: génération automatique (affichée en sortie)
pnpm db:seed-admin "toi@exemple.com"
# note: avec email CLI, la génération auto est prioritaire même si ADMIN_PASSWORD
# est présent dans .env (fallback legacy uniquement sans arguments CLI)
# reset password d'un compte existant (+ promotion admin)
pnpm db:seed-admin "toi@exemple.com" --reset-password

# 5. Démarrer l'app
pnpm dev
```

L'application est disponible sur **http://localhost:3030** (port par défaut).

En local, `pnpm dev` tourne par défaut en rôle **`hybrid`** : le même process
sert le HTTP **et** exécute la pipeline IA. Rien à configurer — voir
[Rôles d'exécution](#rôles-dexécution-web--worker--hybrid) pour séparer web et
worker en production.

### Pages principales

| Page | URL |
|------|-----|
| Feed public | `http://localhost:3030/` |
| Proposer un article (public) | `http://localhost:3030/submit` |
| Connexion admin | `http://localhost:3030/login` |
| Administration | `http://localhost:3030/admin` |

### Flux type

1. Se connecter sur `/login` avec les identifiants du seed.
2. Aller sur `/admin/submit`, coller l'URL d'un article.
3. Suivre l'avancement (scrape → extraction → vérification → agrégation → réécriture multilingue).
4. Réviser le brouillon (titre, résumé, verdict, score, réécritures par langue), puis **Publier**.
5. L'article apparaît sur le feed `/`.

---

## Stack complet avec Docker Compose

```bash
docker compose up --build
```

Seed admin dans le conteneur :

```bash
docker compose exec app sh -c \
  'pnpm db:seed-admin "toi@exemple.com" "mot-de-passe-fort"'
# ou reset sur un compte existant:
docker compose exec app sh -c \
  'pnpm db:seed-admin "toi@exemple.com" --reset-password'
```

Adminer (inspecteur DB) :

```bash
docker compose --profile tools up adminer
# → http://localhost:8090
```

---

## Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Serveur de développement (Turbopack) |
| `pnpm build` | Build de production |
| `pnpm start` | Sert le build de production |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Génère une migration depuis le schéma Drizzle |
| `pnpm db:migrate` | Applique les migrations en attente |
| `pnpm db:seed-admin "email" ["password"] [--reset-password]` | Crée/promeut le compte admin; auto-génère le mot de passe si absent; `--reset-password` force une mise à jour du mot de passe pour un compte existant |
| `pnpm db:studio` | Ouvre Drizzle Studio |

---

## Variables d'environnement

Toutes les variables sont documentées dans `.env.example`.

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | oui | Connexion PostgreSQL |
| `ANTHROPIC_API_KEY` | oui | Clé API Anthropic |
| `BETTER_AUTH_SECRET` | oui | Secret des sessions (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | oui | URL publique de l'app |
| `APP_ROLE` | non | Rôle du process : `web`, `worker` ou `hybrid` (défaut). Voir [Rôles d'exécution](#rôles-dexécution-web--worker--hybrid) |
| `DATABASE_POOL_MAX` | non | Connexions max du pool Postgres par process (défaut 10) |
| `APP_PORT` / `DB_PORT` / `ADMINER_PORT` | non | Ports du stack Docker (défauts 3030/5434/8090) |
| `ANTHROPIC_MODEL` | non | Modèle Claude |
| `CHROMIUM_PATH` | non | Chemin vers Chromium (repli Puppeteer) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | non | Origines de confiance en production (CSV) |

---

## Structure du projet

```
src/
  app/[locale]/
    (public)/            # feed, page article (lecture annotée), formulaire de proposition
    admin/               # administration (protégée)
    login/               # connexion admin
    api/                 # statut des jobs + BetterAuth
  components/
    ui/                  # shadcn/ui
    admin/               # composants admin
    article-reader.tsx   # lecture annotée (paragraphes + claims surlignés)
    claim-card.tsx       # fiche claim (statut + sources)
    hero-card.tsx        # carte "à la une" du feed
    secondary-card.tsx   # cartes secondaires du feed
  db/
    schema.ts            # tables Drizzle
    client.ts
    seed-admin.ts / seed-articles.ts / clean-articles.ts
  lib/
    pipeline/            # pipeline IA
      extract-claims.ts  # phase 1 — extraction
      verify.ts          # phase 2 — vérification web
      aggregate.ts       # phase 3 — agrégation
      rewrite.ts         # phase 4 — réécriture multilingue
      queue.ts           # file de jobs (claim SKIP LOCKED + reaper)
      worker.ts          # boucle worker (draine la file)
    runtime-role.ts      # résolution de APP_ROLE (web/worker/hybrid)
    jobs.ts              # création des jobs (insère en pending)
    scrape.ts            # extraction d'article (+ Puppeteer)
    articles.ts          # requêtes publiques
    reading.ts           # ancre les claims aux paragraphes
    boilerplate.ts       # nettoie pubs/CTA
    claim-status.ts      # statuts et couleurs
drizzle/                 # migrations SQL
k8s/                     # manifests Kubernetes
```

---

## Rôles d'exécution (web / worker / hybrid)

La pipeline IA ne tourne plus « après la requête » dans le pod qui l'a reçue :
elle passe par une **file de jobs durable en base**. Un job soumis est inséré en
`pending`, puis un *worker* le réclame de façon atomique
(`SELECT … FOR UPDATE SKIP LOCKED`) — deux process ne prennent jamais le même
job. Un *reaper* requeue les jobs bloqués (pod tué en plein traitement), donc
**plus aucun job orphelin** lors d'un redéploiement ou d'un scale-down.

Une **même image** sert les trois rôles ; la variable `APP_ROLE` décide du
comportement du process au démarrage :

| `APP_ROLE` | Sert le HTTP | Draine la file | Pour qui |
|------------|:---:|:---:|---|
| `hybrid` *(défaut)* | ✅ | ✅ | dev local, `docker compose`, faible volume — **un seul process suffit** |
| `web` | ✅ | ❌ | pods derrière l'ingress, qui ne doivent pas exécuter de jobs |
| `worker` | (serveur up mais hors ingress) | ✅ | pods dédiés au traitement des jobs |

```bash
# Tout-en-un (défaut) — aucun réglage requis
pnpm dev                 # = APP_ROLE=hybrid

# Séparer les rôles (ex. deux terminaux en local)
APP_ROLE=web    pnpm start    # sert le site, n'exécute aucun job
APP_ROLE=worker pnpm start    # exécute les jobs, pas de trafic public
```

> La commande reste `node server.js` (resp. `pnpm start`) dans **tous** les cas :
> c'est `instrumentation.ts` qui démarre la boucle worker quand le rôle est
> `worker` ou `hybrid`.

**Concurrence des jobs** : on traite un job à la fois par process (borne la RAM
Chromium/LLM). Pour aller plus vite, ajoute des process `worker` — le
`SKIP LOCKED` rend l'ajout de replicas sûr.

**Connexions DB** : chaque process (web ou worker) ouvre jusqu'à
`DATABASE_POOL_MAX` connexions. Garde la somme sous le `max_connections` de
Postgres :

```
(replicas web max + replicas worker) × DATABASE_POOL_MAX < postgres max_connections
```

Au-delà, plafonne `DATABASE_POOL_MAX` ou place PgBouncer devant Postgres.

---

## Déploiement Kubernetes

```bash
# 1. Construire et pousser les images
docker build --target runner   -t ton-registry/unbunked:latest .
docker build --target migrator -t ton-registry/unbunked-migrate:latest .
docker build --target seeder   -t ton-registry/unbunked-seeder:latest .
docker push ton-registry/unbunked:latest
docker push ton-registry/unbunked-migrate:latest
docker push ton-registry/unbunked-seeder:latest

# 2. Créer les secrets
cp k8s/secret.example.yaml k8s/secret.yaml
# Renseigner les valeurs base64

# 3. Appliquer
kubectl apply -f k8s/
```

Pour une procédure production centrée GHCR + initContainer (tags `latest` et
`<sha>`), voir `docs/migrator-image.md`.

Le manifest déploie deux groupes de pods à partir de la **même image** :

- **`web`** (`k8s/app.yaml`, `APP_ROLE=web`) — derrière le `Service` / `Ingress`,
  autoscalé par le HPA (`k8s/hpa.yaml`, CPU 70 %, 2→6 replicas).
- **`worker`** (`k8s/worker.yaml`, `APP_ROLE=worker`) — hors ingress, draine la
  file de jobs. Monte `replicas` pour augmenter la concurrence des jobs.

```bash
# Plus de débit sur le traitement des jobs
kubectl scale deployment/worker -n unbunked --replicas=3
```

Les **migrations** s'appliquent via un `Job` ponctuel, à lancer avant un
déploiement qui change le schéma :

```bash
kubectl delete job migrate -n unbunked --ignore-not-found
kubectl apply -f k8s/migrate-job.yaml
```

Le **seed admin** se lance aussi via un `Job` ponctuel (même secrets que l'app) :

```bash
# 1) Le job utilise par défaut l'image latest et admin@unbunked.local
#    (ajuster l'email dans la commande si nécessaire).
kubectl delete job seed-admin -n unbunked --ignore-not-found
kubectl apply -f k8s/seed-admin-job.yaml
kubectl logs -f job/seed-admin -n unbunked
```

Pour forcer un reset du mot de passe d'un compte existant, ajoute
`--reset-password` dans la `command` du job.

### Seed admin en Docker simple (hors Kubernetes)

```bash
# 1) Construire l'image seeder locale
docker build --target seeder -t unbunked-seeder:local .

# 2) Lancer le seed admin en one-shot (même env que l'app)
docker run --rm --env-file .env.production \
  unbunked-seeder:local \
  pnpm db:seed-admin "toi@exemple.com"

# Variante: forcer un reset de mot de passe
docker run --rm --env-file .env.production \
  unbunked-seeder:local \
  pnpm db:seed-admin "toi@exemple.com" --reset-password
```

Variables minimales attendues dans l'environnement du conteneur :
`DATABASE_URL`, `BETTER_AUTH_SECRET` (et optionnellement `BETTER_AUTH_URL`,
`ADMIN_NAME`).

> Avant de monter `web` (HPA) ou `worker` en nombre de replicas, vérifie le
> calcul des connexions DB ci-dessus.
