ALTER TABLE accounts ADD COLUMN deleting_since timestamptz;
--> statement-breakpoint
CREATE FUNCTION keep_deleting_mark() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.deleting_since IS NOT NULL AND NEW.deleting_since IS DISTINCT FROM OLD.deleting_since THEN
    RAISE EXCEPTION 'An Account marked deleting keeps its mark.';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER accounts_keep_deleting_mark BEFORE UPDATE OF deleting_since ON accounts
  FOR EACH ROW EXECUTE FUNCTION keep_deleting_mark();
--> statement-breakpoint
REVOKE ALL ON FUNCTION keep_deleting_mark() FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE deletion_list (
  account_id uuid PRIMARY KEY,
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  deleted_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX deletion_list_deleted_at ON deletion_list (deleted_at);
