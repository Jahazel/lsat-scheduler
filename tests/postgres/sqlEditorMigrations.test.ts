import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createPostgresConnection } from "../../src/lib/postgres";
import { createPostgresTestDatabase } from "./testDatabase";

const exec = promisify(execFile);

it("applies owner SQL twice and the ordinary migration command skips the recorded work", async () => {
  const database = await createPostgresTestDatabase();
  const owner = createPostgresConnection({ database: database.name });
  try {
    await owner.db.execute(sql`drop schema public cascade`);
    await owner.db.execute(sql`create schema public`);
    await owner.db.execute(sql`drop schema drillmap_migrations cascade`);
    const bundle = await exec(process.execPath, ["scripts/sql-editor-migrations.mjs"]);
    await owner.db.execute(sql.raw(bundle.stdout));
    const applied = await owner.db.execute(sql`select * from drillmap_migrations.applied order by id`);
    expect(applied.rows).toHaveLength(10);
    await owner.db.execute(sql`insert into accounts (email, name) values ('retained@example.test', 'Retained')`);
    await owner.db.execute(sql.raw(bundle.stdout));
    const result = await exec(process.execPath, ["--import", "tsx", "scripts/migrate-postgres.mts"], {
      env: { ...process.env, DATABASE_URL: database.setting },
    });
    expect(result.stdout).toContain("Postgres migrations are up to date.");
    expect((await owner.db.execute(sql`select * from drillmap_migrations.applied order by id`)).rows).toEqual(applied.rows);
    expect((await owner.db.execute(sql`select name from accounts`)).rows).toEqual([{ name: "Retained" }]);
  } finally {
    await owner.close();
    await database.cleanup();
  }
});

it("refuses changed, unknown, duplicate, and incomplete migration history", async () => {
  const database = await createPostgresTestDatabase();
  const owner = createPostgresConnection({ database: database.name });
  try {
    const bundle = await exec(process.execPath, ["scripts/sql-editor-migrations.mjs"]);
    for (const damage of [
      "update drillmap_migrations.applied set hash = 'changed' where id = 1",
      "insert into drillmap_migrations.applied (hash, created_at) values ('unknown', 1)",
      "insert into drillmap_migrations.applied (hash, created_at) select hash, created_at from drillmap_migrations.applied limit 1",
      "delete from drillmap_migrations.applied where created_at = (select min(created_at) from drillmap_migrations.applied)",
    ]) {
      await expect(owner.db.transaction(async (tx) => {
        await tx.execute(sql.raw(damage));
        await tx.execute(sql.raw(bundle.stdout));
      })).rejects.toThrow("Migration history does not match this version. Stop.");
    }
    await owner.db.execute(sql.raw(bundle.stdout));
    expect((await owner.db.execute(sql`select * from drillmap_migrations.applied`)).rows).toHaveLength(10);
  } finally {
    await owner.close();
    await database.cleanup();
  }
});

it("rolls back structure and bookkeeping together when migration SQL fails", async () => {
  const database = await createPostgresTestDatabase();
  const owner = createPostgresConnection({ database: database.name });
  try {
    await owner.db.execute(sql`drop schema public cascade`);
    await owner.db.execute(sql`create schema public`);
    await owner.db.execute(sql`drop schema drillmap_migrations cascade`);
    await owner.db.execute(sql`create table accounts (sentinel integer)`);
    const bundle = await exec(process.execPath, ["scripts/sql-editor-migrations.mjs"]);
    await expect(owner.db.execute(sql.raw(bundle.stdout))).rejects.toThrow();
    await owner.db.execute(sql`rollback`);
    expect((await owner.db.execute(sql`select to_regclass('drillmap_migrations.applied') as journal, to_regprocedure('normalized_email(text)') as normalizer`)).rows)
      .toEqual([{ journal: null, normalizer: null }]);
    await owner.db.execute(sql`drop table accounts`);
    await owner.db.execute(sql.raw(bundle.stdout));
    expect((await owner.db.execute(sql`select * from drillmap_migrations.applied`)).rows).toHaveLength(10);
  } finally {
    await owner.close();
    await database.cleanup();
  }
});

it("finishes an already recorded valid migration prefix", async () => {
  const database = await createPostgresTestDatabase();
  const owner = createPostgresConnection({ database: database.name });
  try {
    await owner.db.execute(sql`drop schema public cascade`);
    await owner.db.execute(sql`create schema public`);
    await owner.db.execute(sql`delete from drillmap_migrations.applied where created_at > (select min(created_at) from drillmap_migrations.applied)`);
    const prefix = (await owner.db.execute(sql`select * from drillmap_migrations.applied`)).rows;
    expect(prefix).toHaveLength(1);
    const bundle = await exec(process.execPath, ["scripts/sql-editor-migrations.mjs"]);
    await owner.db.execute(sql.raw(bundle.stdout));
    const applied = (await owner.db.execute(sql`select * from drillmap_migrations.applied order by created_at`)).rows;
    expect(applied).toHaveLength(10);
    expect(applied[0]).toEqual(prefix[0]);
    expect((await owner.db.execute(sql`select count(*)::integer as count from accounts`)).rows).toEqual([{ count: 0 }]);
  } finally {
    await owner.close();
    await database.cleanup();
  }
});
