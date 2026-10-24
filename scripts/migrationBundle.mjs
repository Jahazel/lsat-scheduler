import { readMigrationFiles } from "drizzle-orm/migrator";

export function readMigrations() {
  return readMigrationFiles({ migrationsFolder: "migrations" });
}

export function migrationBundle({ migrations = readMigrations(), beforeCommit = "" } = {}) {
  const expected = migrations.map(({ hash, folderMillis }) => `('${hash}', ${folderMillis})`).join(",\n");
  const blocks = migrations.map(({ hash, folderMillis, sql }, index) => `
DO $drillmap$
BEGIN
  IF NOT EXISTS (SELECT FROM drillmap_migrations.applied WHERE created_at = ${folderMillis}) THEN
    IF (SELECT count(*) FROM drillmap_migrations.applied) <> ${index} THEN
      RAISE EXCEPTION 'Migration history is not an ordered prefix. Stop.';
    END IF;
    ${sql.filter((statement) => statement.replace(/^--.*$/gm, "").trim()).map((statement) => `EXECUTE $migration_${hash}$${statement}$migration_${hash}$;`).join("\n    ")}
    INSERT INTO drillmap_migrations.applied (hash, created_at) VALUES ('${hash}', ${folderMillis});
  END IF;
END;
$drillmap$;
`).join("");

  return `BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL search_path = public;
SELECT pg_advisory_xact_lock(138, 1);
DO $drillmap$
DECLARE
  journal_owner name;
BEGIN
  SELECT r.rolname INTO journal_owner
    FROM pg_namespace n JOIN pg_roles r ON r.oid = n.nspowner
    WHERE n.nspname = 'drillmap_migrations';
  IF journal_owner IS NULL THEN
    -- CREATE SCHEMA IF NOT EXISTS needs database rights even when the schema exists.
    CREATE SCHEMA drillmap_migrations;
  ELSIF journal_owner <> current_user THEN
    EXECUTE format('SET LOCAL ROLE %I', journal_owner);
  END IF;
END;
$drillmap$;
CREATE TABLE IF NOT EXISTS drillmap_migrations.applied (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
LOCK TABLE drillmap_migrations.applied IN ACCESS EXCLUSIVE MODE;
DO $drillmap$
BEGIN
  IF EXISTS (
    SELECT FROM drillmap_migrations.applied a
    WHERE NOT EXISTS (
      SELECT FROM (VALUES ${expected}) AS expected(hash, created_at)
      WHERE expected.hash = a.hash AND expected.created_at = a.created_at
    )
  ) OR EXISTS (
    SELECT FROM drillmap_migrations.applied GROUP BY created_at HAVING count(*) > 1
  ) OR EXISTS (
    SELECT FROM (VALUES ${expected}) AS expected(hash, created_at)
    WHERE expected.created_at < (SELECT max(created_at) FROM drillmap_migrations.applied)
      AND NOT EXISTS (SELECT FROM drillmap_migrations.applied a WHERE a.created_at = expected.created_at)
  ) THEN
    RAISE EXCEPTION 'Migration history does not match this version. Stop.';
  END IF;
END;
$drillmap$;
${blocks}${beforeCommit}
SELECT hash, created_at FROM drillmap_migrations.applied ORDER BY created_at;
COMMIT;
`;
}
