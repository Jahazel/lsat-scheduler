CREATE TABLE security_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logged_at timestamptz NOT NULL DEFAULT now(),
  event text NOT NULL CHECK (event IN ('unexpected_failure')),
  route text NOT NULL CHECK (route ~ '^/[A-Za-z0-9/_-]{0,99}$'),
  error_code text NOT NULL CHECK (error_code ~ '^[0-9a-f]{8}$'),
  error_type text NOT NULL CHECK (error_type ~ '^[A-Za-z0-9_.:]{1,80}$')
);
--> statement-breakpoint
CREATE INDEX security_log_logged_at ON security_log (logged_at);
--> statement-breakpoint
CREATE FUNCTION prune_security_log() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH removed AS (DELETE FROM security_log WHERE logged_at < now() - interval '90 days' RETURNING 1)
  SELECT count(*) FROM removed;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prune_security_log() FROM PUBLIC;
