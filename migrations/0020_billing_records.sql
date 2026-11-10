CREATE TABLE billing_records (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE CHECK (stripe_customer_id <> ''),
  stripe_subscription_id text NOT NULL UNIQUE CHECK (stripe_subscription_id <> ''),
  plan text NOT NULL CHECK (plan IN ('weekly', 'monthly')),
  stripe_status text NOT NULL CHECK (stripe_status IN (
    'trialing', 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'paused'
  )),
  free_week_ends_at timestamptz,
  paid_period_ends_at timestamptz,
  first_charge_succeeded boolean NOT NULL DEFAULT false,
  renewal_failed_at timestamptz
);
--> statement-breakpoint
CREATE TABLE used_free_weeks (
  email_hash text PRIMARY KEY CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  used_on date NOT NULL DEFAULT current_date
);
--> statement-breakpoint
CREATE INDEX used_free_weeks_used_on ON used_free_weeks (used_on);
--> statement-breakpoint
CREATE FUNCTION prune_used_free_weeks() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH removed AS (DELETE FROM used_free_weeks WHERE used_on < current_date - interval '12 months' RETURNING 1)
  SELECT count(*) FROM removed;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prune_used_free_weeks() FROM PUBLIC;
