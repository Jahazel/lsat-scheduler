ALTER TABLE students ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
