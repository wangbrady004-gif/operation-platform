-- Optional Paytm business-portal MID (paste into portal search); set by admins in merchant form.

ALTER TABLE paytm_merchants
ADD COLUMN IF NOT EXISTS portal_listing_mid varchar(128) NULL;

COMMENT ON COLUMN paytm_merchants.portal_listing_mid IS
  'Merchant listing / portal search id for operators, distinct from automation profile keys.';
