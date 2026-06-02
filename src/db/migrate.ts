// Doit être importé avant ./client pour mapper database-url → DATABASE_URL.
import "./normalize-k8s-env";

import { migrate } from "drizzle-orm/postgres-js/migrator";

import { db } from "./client";

// Applies pending Drizzle SQL migrations using the runtime migrator (no
// drizzle-kit needed), so this can ship inside the standalone app image and run
// as the db-migrate initContainer. Idempotent: already-applied migrations are
// skipped via the drizzle.__drizzle_migrations journal.
const MIGRATIONS_FOLDER = "drizzle";

async function main() {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations applied");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(
      "Migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  });
