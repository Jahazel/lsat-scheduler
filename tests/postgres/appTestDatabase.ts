import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll } from "vitest";
import { closePostgresDatabase, createPostgresConnection } from "../../src/lib/postgres";
import { accounts } from "../../src/lib/postgresSchema";
import { createPostgresTestDatabase } from "./testDatabase";

export async function createAppTestDatabase() {
  const database = await createPostgresTestDatabase();
  const role = `drillmap_app_test_${randomUUID().replaceAll("-", "")}`;
  const owner = createPostgresConnection({ database: database.name });
  async function cleanup() {
    await owner.close();
    await database.cleanup();
    const admin = createPostgresConnection({ database: "postgres" });
    try {
      await admin.db.execute(sql`drop role if exists ${sql.identifier(role)}`);
    } finally {
      await admin.close();
    }
  }
  try {
    const roleSql = await readFile("sql/app-role.sql", "utf8");
    const grantsSql = await readFile("sql/app-role-grants.sql", "utf8");
    async function restoreGrants() {
      await owner.db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('drillmap.app_role', ${role}, true)`);
        await tx.execute(sql.raw(grantsSql));
      });
    }
    const password = randomBytes(32).toString("hex");
    await owner.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('drillmap.app_role', ${role}, true)`);
      await tx.execute(sql.raw(roleSql));
      await tx.execute(sql.raw(grantsSql));
      await tx.execute(sql`select set_config('drillmap.test_password', ${password}, true)`);
      await tx.execute(sql.raw(`DO $$ BEGIN
        EXECUTE format('ALTER ROLE %I PASSWORD %L',
          current_setting('drillmap.app_role'), current_setting('drillmap.test_password'));
      END $$;`));
    });
    const setting = new URL(database.setting);
    setting.username = role;
    setting.password = password;
    setting.searchParams.delete("user");
    setting.searchParams.delete("password");
    async function createAccountAsOwner(values: typeof accounts.$inferInsert) {
      const [account] = await owner.db.insert(accounts).values({ googleId: `google-${values.email}`, ...values }).onConflictDoNothing()
        .returning({ id: accounts.id, role: accounts.role });
      return account ?? null;
    }
    return { setting: setting.toString(), ownerSetting: database.setting, role, owner: owner.db, createAccountAsOwner, restoreGrants, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

type AppTestDatabase = Awaited<ReturnType<typeof createAppTestDatabase>>;

export function setUpAppTestDatabase() {
  let current: AppTestDatabase | undefined;
  function ready() {
    if (!current) throw new Error("The app test database exists only inside hooks and tests");
    return current;
  }
  const originalSetting = process.env.DATABASE_URL;
  beforeAll(async () => {
    await closePostgresDatabase();
    current = await createAppTestDatabase();
    process.env.DATABASE_URL = current.setting;
  });
  afterAll(async () => {
    await closePostgresDatabase();
    process.env.DATABASE_URL = originalSetting;
    await current?.cleanup();
  });
  return {
    get setting() { return ready().setting; },
    get ownerSetting() { return ready().ownerSetting; },
    get role() { return ready().role; },
    get owner() { return ready().owner; },
    get createAccountAsOwner() { return ready().createAccountAsOwner; },
    get restoreGrants() { return ready().restoreGrants; },
  };
}
