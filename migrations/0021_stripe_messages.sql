CREATE TABLE stripe_messages (
  id text PRIMARY KEY CHECK (id ~ '^evt_[A-Za-z0-9]{1,250}$'),
  handled_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX stripe_messages_handled_at ON stripe_messages (handled_at);
--> statement-breakpoint
CREATE FUNCTION prune_stripe_messages() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH removed AS (DELETE FROM stripe_messages WHERE handled_at < now() - interval '30 days' RETURNING 1)
  SELECT count(*) FROM removed;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prune_stripe_messages() FROM PUBLIC;
--> statement-breakpoint
ALTER TABLE security_log DROP CONSTRAINT security_log_event_check;
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_event_check CHECK (event IN (
  'unexpected_failure', 'sign_in', 'sign_out_all_devices', 'email_verification', 'password_reset_request', 'password_reset',
  'password_change', 'account_deletion', 'student_data_refused', 'admin_action_refused', 'limit_refused', 'budget_cutoff',
  'admin_role_change', 'emergency_switch', 'forged_request_refused', 'model_reply_refused', 'stripe_message_refused'
));
