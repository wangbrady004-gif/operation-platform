-- Table: ops_launchers
-- One row per registered OpsLauncher EXE (one per ops person).
-- last_seen_at is touched on every /bot-tasks/claim poll — used to show online/offline status.
-- needs_update = true lets the launcher re-download a fresh EXE on next poll.

CREATE TABLE IF NOT EXISTS ops_launchers (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  launcher_id      VARCHAR       NOT NULL UNIQUE,
  bot_root         VARCHAR(512)  NULL,
  needs_update     BOOLEAN       NOT NULL DEFAULT false,
  created_by_email VARCHAR       NOT NULL,
  last_seen_at     TIMESTAMPTZ   NULL,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);
