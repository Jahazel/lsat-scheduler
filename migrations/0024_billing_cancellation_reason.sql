ALTER TABLE billing_records ADD COLUMN cancellation_reason text
  CHECK (cancellation_reason IN ('cancellation_requested', 'payment_failed', 'payment_disputed'));
