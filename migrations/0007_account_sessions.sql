ALTER TABLE accounts
  ADD COLUMN disabled_at timestamptz,
  ADD COLUMN session_version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE FUNCTION raise_session_version() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.disabled_at IS DISTINCT FROM OLD.disabled_at THEN
    NEW.session_version := OLD.session_version + 1;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER accounts_raise_session_version
BEFORE UPDATE OF role, disabled_at ON accounts
FOR EACH ROW EXECUTE FUNCTION raise_session_version();
