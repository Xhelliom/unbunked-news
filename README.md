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
ADMIN_EMAIL=toi@exemple.com ADMIN_PASSWORD='un-mot-de-passe-fort' pnpm db:seed-admin

# 5. Démarrer l'app
pnpm dev
```

L'application est disponible sur **http://localhost:3030** (port par défaut).

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
  'ADMIN_EMAIL=toi@exemple.com ADMIN_PASSWORD="..." pnpm db:seed-admin'
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
| `pnpm db:seed-admin` | Crée le compte admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
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
    jobs.ts              # orchestration
    scrape.ts            # extraction d'article (+ Puppeteer)
    articles.ts          # requêtes publiques
    reading.ts           # ancre les claims aux paragraphes
    boilerplate.ts       # nettoie pubs/CTA
    claim-status.ts      # statuts et couleurs
drizzle/                 # migrations SQL
k8s/                     # manifests Kubernetes
```

---

## Déploiement Kubernetes

```bash
# 1. Construire et pousser les images
docker build --target runner   -t ton-registry/unbunked:latest .
docker build --target migrator -t ton-registry/unbunked-migrate:latest .
docker push ton-registry/unbunked:latest
docker push ton-registry/unbunked-migrate:latest

# 2. Créer les secrets
cp k8s/secret.example.yaml k8s/secret.yaml
# Renseigner les valeurs base64

# 3. Appliquer
kubectl apply -f k8s/
```
