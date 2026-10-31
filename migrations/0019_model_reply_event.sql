ALTER TABLE security_log DROP CONSTRAINT security_log_event_check;
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_event_check CHECK (event IN (
  'unexpected_failure', 'sign_in', 'sign_out_all_devices', 'email_verification', 'password_reset_request', 'password_reset',
  'password_change', 'account_deletion', 'student_data_refused', 'admin_action_refused', 'limit_refused', 'budget_cutoff',
  'admin_role_change', 'emergency_switch', 'forged_request_refused', 'model_reply_refused'
));
--> statement-breakpoint
ALTER TABLE security_log ADD COLUMN row_count integer CHECK (row_count >= 0);
--> statement-breakpoint
ALTER TABLE security_log ADD CONSTRAINT security_log_row_count_only_for_model_replies
  CHECK (row_count IS NULL OR event = 'model_reply_refused');
