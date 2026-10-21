UPDATE activity_check_ins SET status = 'not_started' WHERE status = 'skipped';
--> statement-breakpoint
ALTER TABLE activity_check_ins DROP CONSTRAINT activity_check_ins_actual_minutes_valid;
--> statement-breakpoint
ALTER TABLE activity_check_ins DROP COLUMN actual_minutes;
--> statement-breakpoint
ALTER TABLE activity_check_ins DROP CONSTRAINT activity_check_ins_status_check;
--> statement-breakpoint
ALTER TABLE activity_check_ins ADD CONSTRAINT activity_check_ins_status_check
  CHECK (status IN ('not_started', 'completed'));
