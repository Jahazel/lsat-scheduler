import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { createPostgresConnection, postgresSettingForDatabase, requirePostgresTestTarget } from "../../src/lib/postgres";
import { applyPostgresMigrations } from "../../src/lib/postgresMigrations";

export async function createPostgresTestDatabase() {
  // The copy-site allowlist must never authorize destructive test setup.
  requirePostgresTestTarget();
  const name = `drillmap_test_${randomUUID().replaceAll("-", "")}`;
  const admin = createPostgresConnection({ database: "postgres" });
  let created = false;
  async function cleanup() {
    try {
      if (created) await admin.db.execute(sql`drop database ${sql.identifier(name)} with (force)`);
    } finally {
      await admin.close();
    }
  }
  try {
    await admin.db.execute(sql`create database ${sql.identifier(name)} template template0`);
    created = true;
    const connection = createPostgresConnection({ database: name });
    try {
      await applyPostgresMigrations({ db: connection.db });
    } finally {
      await connection.close();
    }
    return { name, setting: postgresSettingForDatabase(name), cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
