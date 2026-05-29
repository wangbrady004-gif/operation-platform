-- Table: paytm_merchants
-- Stores per-profile bot credentials (sensitive fields AES-encrypted at rest).
-- profile_key matches the key used in tp_settings_2_0.PAYTM (e.g. PAYTM_VKTRADING_MID1).

CREATE TABLE IF NOT EXISTS paytm_merchants (
  id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key              VARCHAR       NOT NULL UNIQUE,
  mobile_number            VARCHAR       NOT NULL,
  password_enc             TEXT          NOT NULL,
  bank_id                  VARCHAR       NOT NULL,
  api                      TEXT          NOT NULL,
  company                  TEXT          NOT NULL,
  last_utr_chat_id         VARCHAR       NOT NULL,
  portal_listing_mid       VARCHAR(128)  NULL,
  merchant                 VARCHAR       NOT NULL,
  txn_pass_enc             TEXT          NOT NULL,
  executable_relative_path VARCHAR(512)  NULL,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);
