DO $$
DECLARE
  migration_role text := coalesce(nullif(current_setting('drillmap.migration_role', true), ''), 'drillmap_migrator');
  owner_oid oid := (SELECT oid FROM pg_roles WHERE rolname = current_user);
  migrator_oid oid;
  journal_owner oid;
  object record;
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = migration_role) THEN
    EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', migration_role);
  END IF;
  IF EXISTS (
    SELECT FROM pg_roles r WHERE r.rolname = migration_role AND (
      r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
      OR r.rolinherit OR NOT r.rolcanlogin
      OR EXISTS (SELECT FROM pg_auth_members WHERE member = r.oid)
    )
  ) THEN
    RAISE EXCEPTION 'The migration role must have no administration rights or memberships.';
  END IF;
  migrator_oid := (SELECT oid FROM pg_roles WHERE rolname = migration_role);
  IF EXISTS (
    SELECT FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND c.relowner NOT IN (owner_oid, migrator_oid)
    UNION ALL
    SELECT FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND p.proowner NOT IN (owner_oid, migrator_oid)
    UNION ALL
    SELECT FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND t.typowner NOT IN (owner_oid, migrator_oid)
  ) THEN
    RAISE EXCEPTION 'Another role owns app objects. Stop and inspect them.';
  END IF;
  -- Changing an owner requires acting as the new owner.
  EXECUTE format('GRANT %I TO %I WITH INHERIT FALSE, SET TRUE', migration_role, current_user);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), migration_role);
  EXECUTE format('GRANT USAGE, CREATE ON SCHEMA public TO %I', migration_role);
  CREATE SCHEMA IF NOT EXISTS drillmap_migrations;
  journal_owner := (SELECT nspowner FROM pg_namespace WHERE nspname = 'drillmap_migrations');
  IF journal_owner = owner_oid THEN
    -- A new owner needs CREATE on the object's schema.
    EXECUTE format('GRANT USAGE, CREATE ON SCHEMA drillmap_migrations TO %I', migration_role);
  END IF;
  -- Sequences and indexes follow their table.
  FOR object IN
    SELECT format('%I.%I', n.nspname, c.relname) AS name, CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END AS kind
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND c.relowner = owner_oid
        AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
        AND NOT EXISTS (SELECT FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i'))
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO %I', object.kind, object.name, migration_role);
  END LOOP;
  FOR object IN
    SELECT p.oid::regprocedure::text AS name FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND p.proowner = owner_oid
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO %I', object.name, migration_role);
  END LOOP;
  FOR object IN
    SELECT format('%I.%I', n.nspname, t.typname) AS name, CASE t.typtype WHEN 'd' THEN 'DOMAIN' ELSE 'TYPE' END AS kind
      FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname IN ('public', 'drillmap_migrations') AND t.typowner = owner_oid
        AND t.typtype IN ('d', 'e', 'r')
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO %I', object.kind, object.name, migration_role);
  END LOOP;
  IF journal_owner = owner_oid THEN
    EXECUTE format('ALTER SCHEMA drillmap_migrations OWNER TO %I', migration_role);
  END IF;
END;
$$;
