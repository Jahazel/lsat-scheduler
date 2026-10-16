import { readMigrationFiles } from "drizzle-orm/migrator";

const migrations = readMigrationFiles({ migrationsFolder: "migrations" });
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

process.stdout.write(`BEGIN;
SET LOCAL standard_conforming_strings = on;
SET LOCAL search_path = public;
SELECT pg_advisory_xact_lock(138, 1);
CREATE SCHEMA IF NOT EXISTS drillmap_migrations;
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
${blocks}
COMMIT;
SELECT hash, created_at FROM drillmap_migrations.applied ORDER BY created_at;
`);
