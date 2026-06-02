# Image migrator (Drizzle) pour Kubernetes

Ce document décrit comment publier et utiliser l'image
`ghcr.io/xhelliom/unbunked-migrator` pour exécuter les migrations DB avant le
démarrage des pods web.

## Commande de migration utilisée

Le projet utilise le script npm suivant:

- `pnpm db:migrate`
- qui exécute `drizzle-kit migrate` (défini dans `package.json`)

L'image `Dockerfile.migrator` lance exactement cette commande en `CMD`.

## Variables d'environnement requises

La variable obligatoire est:

- `DATABASE_URL` (URL PostgreSQL complète)

Exemple:

```bash
DATABASE_URL='postgresql://unbunked:password@postgres:5432/unbunked'
```

## Build et push local vers GHCR

Prérequis:

- être authentifié sur GHCR (`docker login ghcr.io`)
- avoir les droits de push sur `ghcr.io/xhelliom/unbunked-migrator`

```bash
export IMAGE=ghcr.io/xhelliom/unbunked-migrator
export SHA_TAG="$(git rev-parse --short=12 HEAD)"

docker build -f Dockerfile.migrator -t "$IMAGE:latest" -t "$IMAGE:$SHA_TAG" .
docker push "$IMAGE:latest"
docker push "$IMAGE:$SHA_TAG"
```

## Test local de l'image migrator

```bash
docker run --rm \
  -e DATABASE_URL='postgresql://unbunked:unbunked@host.docker.internal:5434/unbunked' \
  ghcr.io/xhelliom/unbunked-migrator:latest
```

Comportement attendu:

- sortie `0` si toutes les migrations passent
- sortie non-zéro si une migration échoue (comportement standard de `pnpm`/`drizzle-kit`)

## Usage côté Kubernetes initContainer

Exemple d'initContainer (à intégrer dans votre Deployment web):

```yaml
initContainers:
  - name: migrate
    image: ghcr.io/xhelliom/unbunked-migrator:<sha>
    imagePullPolicy: IfNotPresent
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: unbunked-secrets
            key: DATABASE_URL
```

Recommandation production:

- utiliser le tag immuable `<sha>` pour éviter les dérives liées à `latest`
- garder `latest` pour les tests rapides/environnements non critiques
