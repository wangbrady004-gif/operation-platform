-- Table: bot_tasks
-- One row per ops session request. Lifecycle: pending → running → stop_requested → done.
-- claimed_by is set to the launcher_id when an OpsLauncher EXE picks up the task.

CREATE TABLE IF NOT EXISTS bot_tasks (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id      VARCHAR     NOT NULL,
  profile_key      VARCHAR     NOT NULL,
  module           VARCHAR     NOT NULL,
  settings_key     VARCHAR     NOT NULL,
  login_type       VARCHAR     NOT NULL,
  status           VARCHAR(20) NOT NULL DEFAULT 'pending',
  claimed_by       VARCHAR     NULL,
  created_by_email VARCHAR     NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
