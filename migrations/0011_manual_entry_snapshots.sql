ALTER TABLE analytics_snapshots DROP CONSTRAINT analytics_snapshots_extraction_source_check;
--> statement-breakpoint
ALTER TABLE analytics_snapshots ADD CONSTRAINT analytics_snapshots_extraction_source_check
  CHECK (extraction_source IN ('7sage_screenshot', 'admin_sample', 'manual_entry'));
