# Unbunked News

Plateforme de fact-checking : on soumet l'URL d'un article, une pipeline IA
(Claude + recherche web) extrait les affirmations vérifiables, les vérifie une
à une avec de vraies sources, puis produit un verdict, un score de fiabilité
et une analyse claim par claim. Le tout est publié sur un front public façon
site d'actualité, bilingue (FR/EN) avec thème clair/sombre.

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
# 3. Lancer Postgres en arrière-plan + appliquer les migrations
docker compose up -d db
pnpm db:migrate

# 4. Créer le premier compte admin
ADMIN_EMAIL=toi@exemple.com ADMIN_PASSWORD='un-mot-de-passe-fort' pnpm db:seed-admin

# 5. Démarrer l'app
pnpm dev
```

L'application est disponible sur **http://localhost:3000**.

### Pages principales

| Page | URL |
|------|-----|
| Feed public | `http://localhost:3000/` |
| Proposer un article (public) | `http://localhost:3000/submit` |
| Connexion admin | `http://localhost:3000/login` |
| Administration | `http://localhost:3000/admin` |

### Flux type

1. Se connecter sur `/login` avec les identifiants du seed.
2. Aller sur `/admin/submit`, coller l'URL d'un article.
3. Suivre l'avancement de l'analyse (extraction → vérification web → agrégation).
4. Réviser le brouillon (titre, résumé, verdict, score), puis **Publier**.
5. L'article apparaît sur le feed `/`.

---

## Stack complet avec Docker Compose

Lance PostgreSQL, applique les migrations (service `migrate`) et démarre l'app (service `app`) :

```bash
# Renseigne ANTHROPIC_API_KEY et BETTER_AUTH_SECRET dans .env avant tout
docker compose up --build
```

Seed admin dans le conteneur :

```bash
docker compose exec app sh -c \
  'ADMIN_EMAIL=toi@exemple.com ADMIN_PASSWORD="..." pnpm db:seed-admin'
```

Accès à Adminer (inspecteur DB) :

```bash
docker compose --profile tools up adminer
# → http://localhost:8080
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
| `pnpm db:seed-admin` | Crée le compte admin (via `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `pnpm db:studio` | Ouvre Drizzle Studio (UI DB) |

---

## Variables d'environnement

Toutes les variables sont documentées dans `.env.example`.

| Variable | Requis | Description |
|----------|--------|-------------|
| `DATABASE_URL` | oui | Connexion PostgreSQL (ex. `postgresql://unbunked:unbunked@localhost:5432/unbunked`) |
| `ANTHROPIC_API_KEY` | oui | Clé API Anthropic — pipeline IA |
| `BETTER_AUTH_SECRET` | oui | Secret de signature des sessions (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | oui | URL publique de l'app (ex. `http://localhost:3000`) |
| `ANTHROPIC_MODEL` | non | Modèle Claude (défaut : `claude-opus-4-7`) |
| `CHROMIUM_PATH` | non | Chemin vers Chromium pour le repli Puppeteer (auto dans Docker) |
| `BETTER_AUTH_TRUSTED_ORIGINS` | non | Origines de confiance en production (CSV) |

---

## Structure du projet

```
src/
  app/[locale]/
    (public)/            # feed, page article, formulaire de proposition
      page.tsx           # home — feed avec filtres verdict/thème
      article/[slug]/    # page article complète (claims + sources)
      submit/            # formulaire public « proposer un article »
    admin/               # interface d'administration (protégée)
      page.tsx           # tableau de bord — liste des articles
      submit/            # soumission d'une URL à analyser
      jobs/[id]/         # suivi en temps réel de l'analyse
      articles/[id]/     # révision et publication du brouillon
      proposals/         # gestion des propositions reçues
    login/               # connexion admin
    api/
      admin/jobs/[id]/   # endpoint de polling (statut du job)
      auth/              # BetterAuth
  components/
    ui/                  # shadcn/ui (Button, Card, Badge, Input…)
    admin/               # composants admin (LoginForm, JobStatus…)
    article-card.tsx     # carte du feed public
    feed-filters.tsx     # filtres verdict / thème
    verdict-badge.tsx    # badge coloré verdict
  db/
    schema.ts            # tables Drizzle (articles, claims, sources, tags…)
    client.ts
    seed-admin.ts
  lib/
    pipeline/            # pipeline IA en 3 phases
      extract-claims.ts  # phase 1 — extraction des claims
      verify.ts          # phase 2 — vérification web claim par claim
      aggregate.ts       # phase 3 — agrégation → verdict + score
    jobs.ts              # orchestration (createAnalysisJob, getJob)
    scrape.ts            # récupération d'article + repli Puppeteer
    articles.ts          # requêtes publiques (feed, filtres, slug)
    session.ts           # helpers BetterAuth côté serveur
drizzle/                 # migrations SQL générées
k8s/                     # manifests Kubernetes
```

---

## Déploiement Kubernetes

Les manifests sont dans `k8s/`. Étapes :

```bash
# 1. Construire et pousser les images
docker build --target runner  -t ton-registry/unbunked:latest .
docker build --target migrator -t ton-registry/unbunked-migrate:latest .
docker push ton-registry/unbunked:latest
docker push ton-registry/unbunked-migrate:latest

# 2. Créer les secrets
cp k8s/secret.example.yaml k8s/secret.yaml
# Renseigner les valeurs base64 dans k8s/secret.yaml

# 3. Appliquer
kubectl apply -f k8s/
```
