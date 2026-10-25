DO $$
DECLARE
  app_role text := coalesce(nullif(current_setting('drillmap.app_role', true), ''), 'drillmap_app');
  table_owner name;
BEGIN
  SELECT r.rolname INTO table_owner FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner
    WHERE c.oid = 'public.accounts'::regclass;
  IF table_owner <> current_user THEN
    EXECUTE format('SET LOCAL ROLE %I', table_owner);
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = app_role) THEN
    RAISE EXCEPTION 'The app role does not exist. Run sql/app-role.sql as the Neon owner first.';
  END IF;
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
  REVOKE ALL PRIVILEGES ON TABLE public.accounts, public.students, public.leads,
    public.analytics_snapshots, public.practice_test_results, public.weekly_schedules, public.activity_check_ins, public.action_counters, public.running_scans,
    public.scan_settings, public.scan_spending FROM PUBLIC;
  EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.accounts, public.students, public.leads, public.analytics_snapshots, public.practice_test_results, public.weekly_schedules, public.activity_check_ins, public.action_counters, public.running_scans, public.scan_settings, public.scan_spending FROM %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.accounts, public.students, public.leads, public.analytics_snapshots, public.practice_test_results, public.activity_check_ins, public.action_counters TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, DELETE ON TABLE public.weekly_schedules, public.running_scans TO %I', app_role);
  EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.scan_spending TO %I', app_role);
  EXECUTE format('GRANT SELECT ON TABLE public.scan_settings TO %I', app_role);
END;
$$;
