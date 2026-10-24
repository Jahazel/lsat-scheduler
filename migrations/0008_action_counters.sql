CREATE TABLE action_counters (
  action text NOT NULL,
  subject text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  count integer NOT NULL CHECK (count > 0),
  PRIMARY KEY (action, subject, window_start)
);
