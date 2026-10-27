import { resolve } from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getPostgresDatabase, requirePostgresScriptTarget } from "./postgres";

const knownRefusals = new Set([
  "Migration history does not match this version. Stop.",
  "Migration history is not an ordered prefix. Stop.",
  "The app role does not exist. Run sql/app-role.sql as the Neon owner first.",
  "The app role must have no administration rights, memberships, or owned objects.",
  "An Account has no Google ID. Each Account needs exactly one sign-in method, so the owner decides by hand what happens to it. This migration deletes no Account. Stop.",
]);

export function knownMigrationRefusal(error: unknown) {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  return cause instanceof Error && knownRefusals.has(cause.message) ? cause.message : undefined;
}

export async function applyPostgresMigrations({ db }: { db?: ReturnType<typeof getPostgresDatabase> } = {}) {
  // Keep this before pool creation. Every caller gets the script protection.
  requirePostgresScriptTarget();
  await migrate(db ?? getPostgresDatabase(), {
    migrationsFolder: resolve("migrations"),
    migrationsSchema: "drillmap_migrations",
    migrationsTable: "applied",
  });
}
