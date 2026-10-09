import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { afterAll, expect, it } from "vitest";
import { closePostgresDatabase, getPostgresDatabase } from "../../src/lib/postgres";

const exec = promisify(execFile);
afterAll(closePostgresDatabase);

it("applies the migration command once and leaves the applied list unchanged on a second run", async () => {
  const db = getPostgresDatabase();
  await db.execute(sql`drop schema if exists drillmap_migrations cascade`);
  const first = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"]);
  expect(first.stdout).toContain("Postgres migrations are up to date.");
  const applied = await db.execute(sql`select * from drillmap_migrations.applied order by id`);
  expect(applied.rows).toHaveLength(1);
  const second = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"]);
  expect(second.stdout).toContain("Postgres migrations are up to date.");
  expect((await db.execute(sql`select * from drillmap_migrations.applied order by id`)).rows).toEqual(applied.rows);
});
