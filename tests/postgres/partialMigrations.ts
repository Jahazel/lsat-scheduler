import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const MIGRATIONS = { migrationsSchema: "drillmap_migrations", migrationsTable: "applied" };

/** Rebuilds the database with every migration before `tag`. Returns a step that applies the rest. */
export async function migrateUpTo(db: NodePgDatabase, tag: string) {
  const folder = await mkdtemp(path.join(tmpdir(), "drillmap-migrations-"));
  try {
    await cp(path.resolve("migrations"), folder, { recursive: true });
    const journalPath = path.join(folder, "meta", "_journal.json");
    const journal = JSON.parse(await readFile(journalPath, "utf8")) as { entries: { tag: string }[] };
    const stop = journal.entries.findIndex((entry) => entry.tag === tag);
    if (stop < 1) throw new Error(`No migration after the first is tagged ${tag}.`);
    await writeFile(journalPath, JSON.stringify({ ...journal, entries: journal.entries.slice(0, stop) }));
    await db.execute(sql`drop schema public cascade`);
    await db.execute(sql`create schema public`);
    await db.execute(sql`drop schema drillmap_migrations cascade`);
    await migrate(db, { migrationsFolder: folder, ...MIGRATIONS });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
  return () => migrate(db, { migrationsFolder: path.resolve("migrations"), ...MIGRATIONS });
}
