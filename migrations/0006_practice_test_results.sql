CREATE TABLE practice_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  week_of date NOT NULL,
  prep_test integer NOT NULL CHECK (prep_test > 0),
  sections jsonb NOT NULL
    CONSTRAINT practice_test_results_sections_are_four CHECK (jsonb_typeof(sections) = 'array' AND jsonb_array_length(sections) = 4),
  hidden_results jsonb NOT NULL DEFAULT '[]'::jsonb
    CONSTRAINT practice_test_results_hidden_results_is_array CHECK (jsonb_typeof(hidden_results) = 'array'),
  missed_stem_type_counts jsonb NOT NULL
    CONSTRAINT practice_test_results_missed_stem_type_counts_is_object CHECK (jsonb_typeof(missed_stem_type_counts) = 'object'),
  approved_at timestamptz NOT NULL,
  extraction_source text NOT NULL CHECK (extraction_source IN ('7sage_screenshot', 'admin_sample')),
  extracted_at timestamptz NOT NULL,
  extracted_values_match boolean NOT NULL CHECK (extracted_values_match),
  is_this_weeks_practice_test boolean NOT NULL CHECK (is_this_weeks_practice_test),
  confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX practice_test_results_student_approved_at ON practice_test_results (student_id, approved_at DESC);
--> statement-breakpoint
CREATE TRIGGER practice_test_results_set_updated_at
BEFORE UPDATE ON practice_test_results
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
