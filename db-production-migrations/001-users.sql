-- Table: users
-- Stores operator accounts. Roles: viewer | operator | admin.
-- Status: active | inactive — inactive users cannot sign in or use the API.

CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR      NOT NULL UNIQUE,
  password_hash VARCHAR      NOT NULL,
  role          VARCHAR(20)  NOT NULL,
  status        VARCHAR(16)  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
