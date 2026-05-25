-- Production / manual migrations (NODE_ENV=production disables TypeORM synchronize).

ALTER TABLE paytm_merchants
ADD COLUMN IF NOT EXISTS portal_listing_mid varchar(128) NULL;
