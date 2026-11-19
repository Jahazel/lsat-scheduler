WITH app AS (
  SELECT coalesce(nullif(current_setting('drillmap.app_role', true), ''), 'drillmap_app') AS name
)
SELECT check_name, NOT allowed AS refused FROM app, LATERAL (VALUES
  (1, 'set the role of an Account', has_column_privilege(app.name, 'public.accounts', 'role', 'UPDATE')),
  (2, 'insert an Account with a role', has_column_privilege(app.name, 'public.accounts', 'role', 'INSERT')),
  (3, 'set the disabled time', has_column_privilege(app.name, 'public.accounts', 'disabled_at', 'UPDATE')),
  (4, 'insert an Account with a disabled time', has_column_privilege(app.name, 'public.accounts', 'disabled_at', 'INSERT')),
  (5, 'change the Google ID', has_column_privilege(app.name, 'public.accounts', 'google_id', 'UPDATE')),
  (6, 'act as another role', EXISTS (
    SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.member WHERE r.rolname = app.name)),
  (7, 'administration rights', EXISTS (
    SELECT FROM pg_roles r WHERE r.rolname = app.name
      AND (r.rolsuper OR r.rolcreaterole OR r.rolcreatedb OR r.rolreplication OR r.rolbypassrls)))
) AS checks(n, check_name, allowed)
ORDER BY n;
