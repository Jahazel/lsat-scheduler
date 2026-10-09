import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getPostgresDatabase, requirePostgresScriptTarget } from "./postgres";

export async function applyPostgresMigrations({ db }: { db?: ReturnType<typeof getPostgresDatabase> } = {}) {
  // Keep this before pool creation. Every caller gets the script protection.
  requirePostgresScriptTarget();
  await migrate(db ?? getPostgresDatabase(), {
    migrationsFolder: resolve("migrations"),
    migrationsSchema: "drillmap_migrations",
    migrationsTable: "applied",
  });
}
