-- Deferred PayTM anchors: ops pastes order id / customer name on the job page after login.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS paytm_anchor_input jsonb NULL;

COMMENT ON COLUMN jobs.paytm_anchor_input IS
  'When payload.deferAnchors, stores { lastTransactionId, lastCustomerName? } submitted via POST /jobs/:id/paytm-anchors';
