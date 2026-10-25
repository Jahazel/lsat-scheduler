CREATE TABLE scan_settings (
  only_row boolean PRIMARY KEY DEFAULT true CHECK (only_row),
  scanning_off boolean NOT NULL DEFAULT false,
  monthly_limit_usd numeric(10, 2) NOT NULL DEFAULT 10 CHECK (monthly_limit_usd >= 0)
);
--> statement-breakpoint
INSERT INTO scan_settings DEFAULT VALUES;
--> statement-breakpoint
CREATE TABLE scan_spending (
  month_start timestamptz PRIMARY KEY,
  total_usd numeric NOT NULL CHECK (total_usd >= 0),
  warning_sent_at timestamptz,
  limit_alert_sent_at timestamptz
);
