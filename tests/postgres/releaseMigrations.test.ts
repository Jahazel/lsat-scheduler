import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createPostgresConnection, postgresSettingForDatabase } from "../../src/lib/postgres";
import { migrationBundle, readMigrations } from "../../scripts/migrationBundle.mjs";
import { applyReleaseMigrations } from "../../scripts/releaseMigrations";

const suffix = randomUUID().replaceAll("-", "");
const ownerRole = `neon_owner_test_${suffix}`;
const appRole = `drillmap_app_test_${suffix}`;
const migrationRole = `drillmap_migrator_test_${suffix}`;
const databaseName = `drillmap_release_test_${suffix}`;
const ownerPassword = randomBytes(32).toString("hex");
const migratorPassword = randomBytes(32).toString("hex");
const migrations = readMigrations();
const connections: ReturnType<typeof createPostgresConnection>[] = [];
let admin: ReturnType<typeof createPostgresConnection>;
let owner: ReturnType<typeof createPostgresConnection>;

function connectAs(user: string, password: string) {
  const setting = new URL(postgresSettingForDatabase(databaseName));
  setting.username = user;
  setting.password = password;
  setting.searchParams.delete("user");
  setting.searchParams.delete("password");
  vi.stubEnv("DATABASE_URL", setting.toString());
  try {
    const connection = createPostgresConnection();
    connections.push(connection);
    return connection;
  } finally {
    vi.unstubAllEnvs();
  }
}

async function runAsOwner(file: string) {
  const text = await readFile(file, "utf8");
  await owner.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('drillmap.app_role', ${appRole}, true)`);
    await tx.execute(sql`select set_config('drillmap.migration_role', ${migrationRole}, true)`);
    await tx.execute(sql.raw(text));
  });
}

async function objectsNotOwnedByMigrator() {
  const result = await admin.db.execute(sql`
    select kind, name from (
      select 'relation' as kind, c.relname::text as name, c.relowner as owner_id from pg_class c
        join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('public', 'drillmap_migrations')
      union all
      select 'function', p.proname::text, p.proowner from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'drillmap_migrations')
      union all
      select 'type', t.typname::text, t.typowner from pg_type t
        join pg_namespace n on n.oid = t.typnamespace where n.nspname in ('public', 'drillmap_migrations')
      union all
      select 'schema', nspname::text, nspowner from pg_namespace where nspname = 'drillmap_migrations'
    ) objects where owner_id <> ${migrationRole}::regrole
  `);
  return result.rows;
}

async function journal() {
  return (await admin.db.execute(sql`select hash, created_at from drillmap_migrations.applied order by created_at`)).rows;
}

async function appCan(table: string, privilege: string) {
  const result = await admin.db.execute(sql`select has_table_privilege(${appRole}, ${table}, ${privilege}) as allowed`);
  return result.rows[0]?.allowed;
}

beforeAll(async () => {
  const server = createPostgresConnection({ database: "postgres" });
  connections.push(server);
  await server.db.execute(sql.raw(`create role ${ownerRole} login createrole createdb password '${ownerPassword}'`));
  await server.db.execute(sql.raw(`create database ${databaseName} owner ${ownerRole} template template0`));
  await server.db.execute(sql.raw(`alter database ${databaseName} set drillmap.app_role = '${appRole}'`));
  admin = createPostgresConnection({ database: databaseName });
  connections.push(admin);
  owner = connectAs(ownerRole, ownerPassword);
  await owner.db.execute(sql.raw(migrationBundle({ migrations: migrations.slice(0, -1) })));
  await runAsOwner("sql/app-role.sql");
  await runAsOwner("sql/migration-role.sql");
  await owner.db.execute(sql.raw(`alter role ${migrationRole} password '${migratorPassword}'`));
});

afterAll(async () => {
  for (const connection of connections.splice(1)) await connection.close();
  const server = connections[0];
  try {
    await server?.db.execute(sql.raw(`drop database if exists ${databaseName} with (force)`));
    for (const role of [appRole, migrationRole, `${migrationRole}_member`, ownerRole]) {
      await server?.db.execute(sql.raw(`drop role if exists ${role}`));
    }
  } finally {
    await server?.close();
  }
});

it("hands every app object to a migration role that cannot create roles or databases", async () => {
  expect(await objectsNotOwnedByMigrator()).toEqual([]);
  expect((await admin.db.execute(sql`
    select rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls,
      exists(select from pg_auth_members where member = pg_roles.oid) as has_membership
    from pg_roles where rolname = ${migrationRole}
  `)).rows).toEqual([{
    rolcanlogin: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
    rolreplication: false, rolbypassrls: false, has_membership: false,
  }]);
  expect((await admin.db.execute(sql`select has_database_privilege(${migrationRole}, current_database(), 'CREATE') as allowed`)).rows)
    .toEqual([{ allowed: false }]);
  const migrator = connectAs(migrationRole, migratorPassword);
  for (const query of [sql.raw(`create role ${migrationRole}_probe`), sql.raw(`create database ${migrationRole}_probe`)]) {
    await expect(migrator.db.execute(query)).rejects.toMatchObject({ cause: { code: "42501" } });
  }
  await expect(migrator.db.execute(sql.raw(`set role ${ownerRole}`))).rejects.toMatchObject({ cause: { code: "42501" } });
});

it("applies a new migration and the app grants, then changes nothing on a second run", async () => {
  await admin.db.execute(sql.raw(`grant update on weekly_schedules to ${appRole}`));
  const migrator = connectAs(migrationRole, migratorPassword);
  expect(await applyReleaseMigrations(migrator.db)).toEqual({ before: migrations.length - 1, after: migrations.length });
  const applied = await journal();
  expect(applied.map((row) => row.hash)).toEqual(migrations.map((migration) => migration.hash));
  expect(await objectsNotOwnedByMigrator()).toEqual([]);
  expect(await appCan("public.weekly_schedules", "UPDATE")).toBe(false);
  expect(await appCan("public.accounts", "UPDATE")).toBe(false);
  expect(await appCan("public.students", "INSERT")).toBe(true);

  expect(await applyReleaseMigrations(migrator.db)).toEqual({ before: migrations.length, after: migrations.length });
  expect(await journal()).toEqual(applied);
});

it("refuses a changed old migration and saves nothing", async () => {
  const before = await journal();
  const changed = migrations.map((migration, index) => index === 1 ? { ...migration, hash: "0".repeat(64) } : migration);
  const migrator = connectAs(migrationRole, migratorPassword);
  await expect(applyReleaseMigrations(migrator.db, { migrations: changed })).rejects.toMatchObject({
    cause: { message: "Migration history does not match this version. Stop." },
  });
  await connections.splice(connections.indexOf(migrator), 1)[0]?.close();
  expect(await journal()).toEqual(before);
});

it("lets the Neon owner run the manual bundle and grants as the migration role", async () => {
  await owner.db.execute(sql.raw(migrationBundle()));
  await runAsOwner("sql/app-role.sql");
  await runAsOwner("sql/app-role-grants.sql");
  expect(await objectsNotOwnedByMigrator()).toEqual([]);
  expect(await appCan("public.accounts", "SELECT")).toBe(true);
  await runAsOwner("sql/migration-role.sql");
  expect(await objectsNotOwnedByMigrator()).toEqual([]);
});

it("refuses a migration role that can switch to another role", async () => {
  const member = `${migrationRole}_member`;
  await admin.db.execute(sql.raw(`create role ${member} login noinherit`));
  await admin.db.execute(sql.raw(`grant ${ownerRole} to ${member}`));
  await expect(owner.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('drillmap.migration_role', ${member}, true)`);
    await tx.execute(sql.raw(await readFile("sql/migration-role.sql", "utf8")));
  })).rejects.toMatchObject({ cause: { message: "The migration role must have no administration rights or memberships." } });
});
