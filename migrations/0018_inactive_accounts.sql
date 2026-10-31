ALTER TABLE accounts ADD COLUMN last_signed_in_at timestamptz NOT NULL DEFAULT now();
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN inactive_warning_sent_at timestamptz;
