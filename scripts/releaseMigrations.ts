import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import type { getPostgresDatabase } from "../src/lib/postgres";
import copyDatabaseHosts from "./copyDatabaseHosts.json";
import { getDatabaseHost } from "./localDatabaseGuard.mjs";
import { migrationBundle, readMigrations } from "./migrationBundle.mjs";
import productionDatabaseHosts from "./productionDatabaseHosts.json";

const targetHosts = { copy: copyDatabaseHosts, production: productionDatabaseHosts };
export type ReleaseTarget = keyof typeof targetHosts;

export class ReleaseRefusal extends Error {}

const knownDatabaseMessages = new Set([
  "Migration history does not match this version. Stop.",
  "Migration history is not an ordered prefix. Stop.",
  "The app role does not exist. Run sql/app-role.sql as the Neon owner first.",
  "The app role must have no administration rights, memberships, or owned objects.",
]);

export function requireReleaseTarget(
  environment: Record<string, string | undefined>,
): ReleaseTarget {
  if (environment.GITHUB_ACTIONS !== "true") {
    throw new ReleaseRefusal("Release migrations run only in the GitHub release workflow.");
  }
  const target = environment.MIGRATION_TARGET;
  if (target !== "copy" && target !== "production") {
    throw new ReleaseRefusal("MIGRATION_TARGET must be copy or production.");
  }
  requireHostOfTarget(target, environment.DATABASE_URL);
  return target;
}

function requireHostOfTarget(target: ReleaseTarget, uri: string | undefined) {
  let hosts: string[];
  try {
    hosts = getDatabaseHost(uri).split(",").map((host) => host.replace(/:\d+$/, "").toLowerCase());
  } catch {
    throw new ReleaseRefusal("Cannot read the database host.");
  }
  if (!hosts.every((host) => targetHosts[target].includes(host))) {
    throw new ReleaseRefusal(`The database host is not a ${target} host. Stop.`);
  }
}

async function journalRows(db: ReturnType<typeof getPostgresDatabase>) {
  const journal = await db.execute(sql`select to_regclass('drillmap_migrations.applied') is not null as present`);
  if (!journal.rows[0]?.present) return 0;
  const result = await db.execute(sql`select count(*)::int as count from drillmap_migrations.applied`);
  return Number(result.rows[0]?.count);
}

export async function applyReleaseMigrations(
  db: ReturnType<typeof getPostgresDatabase>,
  { migrations = readMigrations() }: { migrations?: ReturnType<typeof readMigrations> } = {},
) {
  const grants = await readFile("sql/app-role-grants.sql", "utf8");
  const before = await journalRows(db);
  await db.execute(sql.raw(migrationBundle({ migrations, beforeCommit: grants })));
  return { before, after: await journalRows(db) };
}

export function publicFailureMessage(error: unknown) {
  if (error instanceof ReleaseRefusal) return error.message;
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  if (cause instanceof Error && knownDatabaseMessages.has(cause.message)) {
    return `Migration refused: ${cause.message}`;
  }
  const code = cause instanceof Error && "code" in cause && typeof cause.code === "string" && /^[0-9A-Z]{5}$/.test(cause.code)
    ? cause.code : undefined;
  return code
    ? `Migration failed with database error code ${code}.`
    : "Migration failed. Check the connection setting and migration files.";
}
