ALTER TABLE accounts ADD COLUMN google_id text UNIQUE
  CONSTRAINT accounts_google_id_not_empty CHECK (google_id <> '');
