-- Merchant automation: operator-requested stop while worker holds the job.
-- Also migrate legacy PayTM rows still marked queued → starting (waiting for worker).

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS cancellation_requested_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN jobs.cancellation_requested_at IS
  'When set while state=running, worker should terminate the bot subprocess and finish as cancelled.';

UPDATE jobs
SET state = 'starting'
WHERE state = 'queued'
  AND payload IS NOT NULL
  AND payload->>'kind' = 'paytm';
