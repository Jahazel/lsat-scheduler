CREATE TABLE test_months (
  month date PRIMARY KEY CHECK (extract(day FROM month) = 1)
);
--> statement-breakpoint
INSERT INTO test_months (month) VALUES
  ('2026-10-01'), ('2026-11-01'), ('2027-01-01'), ('2027-02-01'), ('2027-04-01'), ('2027-06-01');
