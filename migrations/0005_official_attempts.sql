ALTER TABLE students ADD COLUMN official_attempts jsonb NOT NULL DEFAULT '[]'::jsonb
  CONSTRAINT students_official_attempts_is_array CHECK (jsonb_typeof(official_attempts) = 'array');
