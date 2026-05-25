-- Run manually when NODE_ENV=production (synchronize=false).
-- Dev: TypeORM synchronize adds these automatically.

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS payload jsonb;

CREATE TABLE IF NOT EXISTS paytm_merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key varchar NOT NULL UNIQUE,
  mobile_number varchar NOT NULL,
  password_enc text NOT NULL,
  bank_id varchar NOT NULL,
  api text NOT NULL,
  company text NOT NULL,
  last_utr_chat_id varchar NOT NULL,
  merchant varchar NOT NULL,
  txn_pass_enc text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_paytm_merchants_profile ON paytm_merchants (profile_key);
