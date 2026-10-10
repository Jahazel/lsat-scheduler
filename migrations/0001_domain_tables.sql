CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  password_hash text,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  simulated_date date,
  CONSTRAINT accounts_email_normalized CHECK (
    email <> '' AND email = lower(regexp_replace(email, '^\s+|\s+$', '', 'g'))
  )
);
--> statement-breakpoint
CREATE FUNCTION normalize_email() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.email := lower(regexp_replace(NEW.email, '^\s+|\s+$', '', 'g'));
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER accounts_normalize_email
BEFORE INSERT OR UPDATE ON accounts
FOR EACH ROW EXECUTE FUNCTION normalize_email();
--> statement-breakpoint
-- Each day's capacity uses the same range and 15-minute step rule.
-- Use exact numeric values so Postgres cannot round a fractional input to an integer.
CREATE DOMAIN daily_capacity_minutes AS numeric
CHECK (VALUE BETWEEN 30 AND 480 AND VALUE % 15 = 0);
--> statement-breakpoint
CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('7Sage', 'LSAT Demon')),
  current_score integer NOT NULL,
  goal_score integer NOT NULL,
  goal_test_date date NOT NULL,
  preferred_practice_test_day text NOT NULL CHECK (preferred_practice_test_day IN (
    'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
  )),
  accommodation_multiplier numeric NOT NULL CHECK (accommodation_multiplier IN (1, 1.5, 2)),
  monday_capacity_minutes daily_capacity_minutes NOT NULL,
  tuesday_capacity_minutes daily_capacity_minutes NOT NULL,
  wednesday_capacity_minutes daily_capacity_minutes NOT NULL,
  thursday_capacity_minutes daily_capacity_minutes NOT NULL,
  friday_capacity_minutes daily_capacity_minutes NOT NULL,
  saturday_capacity_minutes daily_capacity_minutes NOT NULL,
  sunday_capacity_minutes daily_capacity_minutes NOT NULL
);
--> statement-breakpoint
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT leads_email_normalized CHECK (
    email <> '' AND email = lower(regexp_replace(email, '^\s+|\s+$', '', 'g'))
  )
);
--> statement-breakpoint
CREATE TRIGGER leads_normalize_email
BEFORE INSERT OR UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION normalize_email();
--> statement-breakpoint
-- Every new snapshot is approved. Legacy status and metadata belong to MongoDB only.
CREATE TABLE analytics_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  lr_accuracy_by_type jsonb NOT NULL,
  lr_top_priority_logic_types text[] NOT NULL,
  approved_at timestamptz NOT NULL,
  extraction_source text NOT NULL CHECK (extraction_source IN ('7sage_screenshot', 'admin_sample')),
  extracted_at timestamptz NOT NULL,
  extracted_values_match boolean NOT NULL CHECK (extracted_values_match),
  is_latest_analytics boolean NOT NULL CHECK (is_latest_analytics),
  confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX analytics_snapshots_student_approved_at ON analytics_snapshots (student_id, approved_at DESC);
--> statement-breakpoint
CREATE TABLE weekly_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_start_date date NOT NULL,
  generated_at timestamptz NOT NULL,
  schedule jsonb NOT NULL,
  -- Reference data, not foreign keys. generation_inputs retains the analytics used.
  source_snapshot_ids uuid[] NOT NULL,
  generation_inputs jsonb NOT NULL,
  policy_version text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weekly_schedules_student_week_unique UNIQUE (student_id, week_start_date)
);
--> statement-breakpoint
CREATE FUNCTION refuse_weekly_schedule_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Weekly schedules are immutable; create a new schedule instead of updating an existing one.'
    USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
-- Statement-level protection also rejects no-op and zero-row UPDATE commands.
-- No role exception: the database owner runs this trigger too (ADR 0001/0003).
CREATE TRIGGER weekly_schedules_refuse_update
BEFORE UPDATE ON weekly_schedules
FOR EACH STATEMENT EXECUTE FUNCTION refuse_weekly_schedule_update();
--> statement-breakpoint
CREATE TABLE activity_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES weekly_schedules(id) ON DELETE CASCADE,
  activity_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('not_started', 'completed', 'skipped')),
  actual_minutes double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_check_ins_schedule_activity_unique UNIQUE (schedule_id, activity_id),
  CONSTRAINT activity_check_ins_actual_minutes_valid CHECK (
    actual_minutes IS NULL OR (status = 'completed' AND actual_minutes >= 0 AND actual_minutes < 'Infinity'::double precision)
  )
);
--> statement-breakpoint
CREATE FUNCTION protect_activity_check_in_links() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.schedule_id IS DISTINCT FROM OLD.schedule_id OR NEW.activity_id IS DISTINCT FROM OLD.activity_id THEN
    RAISE EXCEPTION 'An Activity check-in cannot change its Weekly schedule or Schedule activity.'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER activity_check_ins_protect_links
BEFORE UPDATE ON activity_check_ins
FOR EACH ROW EXECUTE FUNCTION protect_activity_check_in_links();
