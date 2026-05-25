-- User active/inactive blocking (JWT + login).
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';

COMMENT ON COLUMN users.status IS 'active | inactive — inactive users cannot sign in or use API (admins toggle on Team page).';
