DO $$
DECLARE
  without_google integer;
BEGIN
  SELECT count(*) INTO without_google FROM accounts WHERE google_id IS NULL;
  IF without_google > 0 THEN
    RAISE EXCEPTION '% Account has no Google ID. Each Account must keep exactly one sign-in method, so the owner decides by hand what happens to it. This migration deletes no Account.', without_google;
  END IF;
END;
$$;
--> statement-breakpoint
UPDATE accounts SET password_hash = NULL WHERE password_hash IS NOT NULL;
--> statement-breakpoint
ALTER TABLE accounts
  ADD CONSTRAINT accounts_password_hash_not_empty CHECK (password_hash <> ''),
  ADD CONSTRAINT accounts_one_sign_in_method CHECK ((password_hash IS NULL) <> (google_id IS NULL)),
  ADD CONSTRAINT accounts_admin_without_password CHECK (role <> 'admin' OR password_hash IS NULL);
--> statement-breakpoint
CREATE TABLE pending_signups (
  email text PRIMARY KEY,
  name text NOT NULL,
  password_hash text NOT NULL CHECK (password_hash <> ''),
  token_hash text NOT NULL UNIQUE CHECK (token_hash <> ''),
  token_expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pending_signups_email_normalized CHECK (email <> '' AND email = normalized_email(email))
);
--> statement-breakpoint
CREATE TRIGGER pending_signups_normalize_email
BEFORE INSERT OR UPDATE ON pending_signups
FOR EACH ROW EXECUTE FUNCTION normalize_email();
--> statement-breakpoint
CREATE TABLE reset_tokens (
  account_id uuid PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash <> ''),
  expires_at timestamptz NOT NULL
);
