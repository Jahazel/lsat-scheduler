ALTER TABLE security_log DROP CONSTRAINT security_log_event_check;
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_event_check CHECK (event IN (
  'unexpected_failure', 'sign_in', 'sign_out_all_devices', 'email_verification', 'password_reset_request', 'password_reset',
  'password_change', 'account_deletion', 'student_data_refused', 'admin_action_refused', 'limit_refused', 'budget_cutoff',
  'admin_role_change', 'emergency_switch'
));
--> statement-breakpoint
ALTER TABLE security_log DROP CONSTRAINT security_log_route_check;
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_route_check CHECK (route ~ '^/[][A-Za-z0-9/_-]{0,99}$');
--> statement-breakpoint
ALTER TABLE security_log ADD COLUMN result text NOT NULL DEFAULT 'failed' CHECK (result ~ '^[a-zA-Z][a-zA-Z-]{0,39}$');
--> statement-breakpoint
ALTER TABLE security_log ALTER COLUMN result DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE security_log ADD COLUMN account_id uuid REFERENCES accounts (id) ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE security_log ADD COLUMN ip_address text CHECK (ip_address = 'unknown' OR ip_address ~ '^[0-9A-Fa-f:.]{2,45}$');
--> statement-breakpoint
ALTER TABLE security_log ADD COLUMN email_hash text CHECK (email_hash ~ '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_email_hash_only_for_sign_in
  CHECK (email_hash IS NULL OR (event = 'sign_in' AND account_id IS NULL));
--> statement-breakpoint
ALTER TABLE security_log ALTER COLUMN route DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE security_log ALTER COLUMN error_code DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE security_log ALTER COLUMN error_type DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_error_only_for_failures
  CHECK ((event = 'unexpected_failure') = (error_code IS NOT NULL AND error_type IS NOT NULL));
--> statement-breakpoint
CREATE INDEX security_log_account ON security_log (account_id, logged_at) WHERE account_id IS NOT NULL;
--> statement-breakpoint
CREATE FUNCTION log_admin_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO security_log (event, result, account_id)
  VALUES ('admin_role_change', CASE WHEN NEW.role = 'admin' THEN 'promoted' ELSE 'demoted' END, NEW.id);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER accounts_role_logged AFTER UPDATE OF role ON accounts
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role) EXECUTE FUNCTION log_admin_role_change();
--> statement-breakpoint
CREATE FUNCTION log_emergency_switch() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO security_log (event, result)
  VALUES ('emergency_switch', CASE WHEN NEW.scanning_off THEN 'turnedOn' ELSE 'turnedOff' END);
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE TRIGGER scan_settings_switch_logged AFTER UPDATE OF scanning_off ON scan_settings
  FOR EACH ROW WHEN (OLD.scanning_off IS DISTINCT FROM NEW.scanning_off) EXECUTE FUNCTION log_emergency_switch();
--> statement-breakpoint
REVOKE ALL ON FUNCTION log_admin_role_change(), log_emergency_switch() FROM PUBLIC;
