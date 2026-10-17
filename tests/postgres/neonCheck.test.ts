import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, expect, it } from "vitest";
import { createAppTestDatabase } from "./appTestDatabase";

const exec = promisify(execFile);
let database: Awaited<ReturnType<typeof createAppTestDatabase>>;

beforeAll(async () => { database = await createAppTestDatabase(); });
afterAll(async () => { await database?.cleanup(); });

async function run(setting = database.setting) {
  try {
    const result = await exec(process.execPath, ["--import", "tsx", "scripts/check-neon.mts"], {
      env: { NODE_ENV: "test", PATH: process.env.PATH, DATABASE_URL: setting }, timeout: 15000,
    });
    return { code: 0, output: result.stdout + result.stderr };
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || !("stdout" in error) || !("stderr" in error)) throw error;
    return { code: error.code, output: `${error.stdout}${error.stderr}` };
  }
}

function expectNoSecret(output: string, setting = database.setting) {
  const url = new URL(setting);
  expect(output).not.toContain(setting);
  expect(output).not.toContain(decodeURIComponent(url.password));
}

it("checks the foundation as the limited login and leaves existing records untouched on repeated runs", async () => {
  await database.owner.execute(sql`insert into accounts (email, name) values ('keep@example.test', 'Keep')`);
  await database.owner.execute(sql`insert into leads (email) values ('keep@example.test')`);
  const before = await database.owner.execute(sql`select * from accounts`);
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await run();
    expect(result.code).toBe(0);
    expect(result.output).toContain("PASS: App reads and writes");
    expect(result.output).toContain("PASS: Owner-only migration journal refused");
    expect(result.output).toContain("PASS: Database rules");
    expect(result.output).toContain("PASS: Account deletion");
    expect(result.output).toContain("PASS: Throwaway records rolled back");
    expect(result.output).toContain("Loopback connection uses no encryption");
    expectNoSecret(result.output);
    expect((await database.owner.execute(sql`select * from accounts`)).rows).toEqual(before.rows);
    expect((await database.owner.execute(sql`select email from leads`)).rows).toEqual([{ email: "keep@example.test" }]);
    for (const table of ["students", "analytics_snapshots", "weekly_schedules", "activity_check_ins"]) {
      expect((await database.owner.execute(sql`select * from ${sql.identifier(table)}`)).rows).toEqual([]);
    }
  }
});

it.each([
  {
    name: "missing app write permission",
    breakRule: (role: string) => sql`revoke insert on analytics_snapshots from ${sql.identifier(role)}`,
    repairRule: (role: string) => sql`grant insert on analytics_snapshots to ${sql.identifier(role)}`,
  },
  {
    name: "extra Weekly schedule update permission",
    breakRule: (role: string) => sql`grant update on weekly_schedules to ${sql.identifier(role)}`,
    repairRule: (role: string) => sql`revoke update on weekly_schedules from ${sql.identifier(role)}`,
  },
  {
    name: "extra owner-only migration journal permission",
    breakRule: (role: string) => sql`grant usage on schema drillmap_migrations to ${sql.identifier(role)};
      grant select on drillmap_migrations.applied to ${sql.identifier(role)}`,
    repairRule: (role: string) => sql`revoke select on drillmap_migrations.applied from ${sql.identifier(role)};
      revoke usage on schema drillmap_migrations from ${sql.identifier(role)}`,
  },
  {
    name: "extra owner-only migration journal change permission",
    breakRule: (role: string) => sql`grant usage on schema drillmap_migrations to ${sql.identifier(role)};
      grant update, delete on drillmap_migrations.applied to ${sql.identifier(role)}`,
    repairRule: (role: string) => sql`revoke update, delete on drillmap_migrations.applied from ${sql.identifier(role)};
      revoke usage on schema drillmap_migrations from ${sql.identifier(role)}`,
  },
])("fails for $name without leaving probe records", async ({ breakRule, repairRule }) => {
  const before = (await database.owner.execute(sql`select id from accounts order by id`)).rows;
  await database.owner.execute(breakRule(database.role));
  try {
    const result = await run();
    expect(result.code).toBe(1);
    expect(result.output).toContain("Database foundation check failed");
    expect(result.output).not.toContain("PASS:");
    expectNoSecret(result.output);
    expect((await database.owner.execute(sql`select id from accounts order by id`)).rows).toEqual(before);
  } finally {
    await database.owner.execute(repairRule(database.role));
  }
});

it("fails for a missing cascade and rolls back the partial Account deletion", async () => {
  await database.owner.execute(sql`alter table analytics_snapshots drop constraint analytics_snapshots_student_id_fkey`);
  await database.owner.execute(sql`alter table analytics_snapshots add constraint analytics_snapshots_student_id_fkey
    foreign key (student_id) references students(id)`);
  try {
    const result = await run();
    expect(result.code).toBe(1);
    expectNoSecret(result.output);
    expect((await database.owner.execute(sql`select * from students`)).rows).toEqual([]);
    expect((await database.owner.execute(sql`select * from analytics_snapshots`)).rows).toEqual([]);
  } finally {
    await database.owner.execute(sql`alter table analytics_snapshots drop constraint analytics_snapshots_student_id_fkey`);
    await database.owner.execute(sql`alter table analytics_snapshots add constraint analytics_snapshots_student_id_fkey
      foreign key (student_id) references students(id) on delete cascade`);
  }
});

it("fails for an administration login before writing records", async () => {
  const setting = new URL(database.setting);
  setting.username = "postgres";
  const result = await run(setting.toString());
  expect(result.code).toBe(1);
  expectNoSecret(result.output);
  expect((await database.owner.execute(sql`select * from students`)).rows).toEqual([]);
});

it("does not print a database error that contains a secret", async () => {
  await database.owner.execute(sql`create function foundation_error() returns trigger language plpgsql as $$
    begin raise exception 'private-password postgres://private-user:private-password@localhost/example'; end $$`);
  await database.owner.execute(sql`create trigger foundation_error before insert on accounts
    for each row execute function foundation_error()`);
  try {
    const result = await run();
    expect(result.code).toBe(1);
    expectNoSecret(result.output);
    expect(result.output).not.toContain("private-password");
    expect(result.output).not.toContain("private-user");
    expect(result.output).not.toContain("postgres://");
  } finally {
    await database.owner.execute(sql`drop trigger foundation_error on accounts`);
    await database.owner.execute(sql`drop function foundation_error()`);
  }
});
