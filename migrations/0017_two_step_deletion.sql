ALTER TABLE accounts ADD COLUMN deleting_since timestamptz;
--> statement-breakpoint
CREATE INDEX accounts_deleting ON accounts (deleting_since) WHERE deleting_since IS NOT NULL;
--> statement-breakpoint
CREATE FUNCTION keep_deleting_mark() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.deleting_since IS NOT NULL AND NEW.deleting_since IS DISTINCT FROM OLD.deleting_since THEN
    RAISE EXCEPTION 'An Account marked deleting stays marked until it is deleted';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER accounts_keep_deleting_mark
BEFORE UPDATE OF deleting_since ON accounts
FOR EACH ROW EXECUTE FUNCTION keep_deleting_mark();
--> statement-breakpoint
REVOKE ALL ON FUNCTION keep_deleting_mark() FROM PUBLIC;
--> statement-breakpoint
CREATE TABLE deletion_list (
  account_id uuid PRIMARY KEY,
  email_hash text NOT NULL CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  deleted_on date NOT NULL DEFAULT current_date
);
--> statement-breakpoint
CREATE INDEX deletion_list_deleted_on ON deletion_list (deleted_on);
--> statement-breakpoint
CREATE FUNCTION prune_deletion_list() RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  WITH removed AS (DELETE FROM deletion_list WHERE deleted_on < current_date - 30 RETURNING 1)
  SELECT count(*) FROM removed;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION prune_deletion_list() FROM PUBLIC;
