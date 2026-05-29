-- Table: audit_events
-- Append-only log of admin/operator actions for traceability.

CREATE TABLE IF NOT EXISTS audit_events (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email   TEXT        NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT        NULL,
  resource_id   TEXT        NULL,
  payload       JSONB       NULL,
  client_ip     TEXT        NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events (created_at);
