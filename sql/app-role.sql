DO $$
DECLARE
  app_role text := coalesce(nullif(current_setting('drillmap.app_role', true), ''), 'drillmap_app');
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = app_role) THEN
    EXECUTE format('CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS', app_role);
  END IF;
  -- NOINHERIT alone does not prevent SET ROLE through a membership.
  IF EXISTS (
    SELECT FROM pg_roles r WHERE r.rolname = app_role AND (
      r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls
      OR r.rolinherit OR NOT r.rolcanlogin
      OR EXISTS (SELECT FROM pg_auth_members WHERE member = r.oid)
      OR EXISTS (SELECT FROM pg_shdepend WHERE refclassid = 'pg_authid'::regclass AND refobjid = r.oid AND deptype = 'o')
    )
  ) THEN
    RAISE EXCEPTION 'The app role must have no administration rights, memberships, or owned objects.';
  END IF;
  -- PUBLIC means every role. A direct revoke cannot override a PUBLIC grant.
  EXECUTE format('REVOKE CREATE, TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
  EXECUTE format('REVOKE ALL PRIVILEGES ON DATABASE %I FROM %I', current_database(), app_role);
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), app_role);
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  EXECUTE format('REVOKE ALL PRIVILEGES ON SCHEMA public FROM %I', app_role);
  EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', app_role);
  REVOKE ALL PRIVILEGES ON TABLE public.accounts, public.students, public.leads,
    public.analytics_snapshots, public.weekly_schedules, public.activity_check_ins FROM PUBLIC;
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.accounts, public.students, public.leads, public.analytics_snapshots, public.weekly_schedules, public.activity_check_ins FROM %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts, public.students, public.leads, public.analytics_snapshots, public.activity_check_ins TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, DELETE ON TABLE public.weekly_schedules TO %I', app_role);
END;
$$;
