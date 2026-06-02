import "dotenv/config";

// Les secrets Kubernetes utilisent souvent des clés en kebab-case (ex. database-url).
// Le code applicatif attend DATABASE_URL : on aligne les deux avant d'importer client.ts.
const K8S_DATABASE_URL_KEY = "database-url";

if (!process.env.DATABASE_URL && process.env[K8S_DATABASE_URL_KEY]) {
  process.env.DATABASE_URL = process.env[K8S_DATABASE_URL_KEY];
}
