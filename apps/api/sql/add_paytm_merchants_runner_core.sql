-- Production / manual migrations (NODE_ENV=production disables TypeORM synchronize).
ALTER TABLE paytm_merchants
  ADD COLUMN IF NOT EXISTS runner_core varchar(16) NULL;
