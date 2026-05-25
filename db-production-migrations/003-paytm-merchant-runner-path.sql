-- Optional thin executable under tp_127_executabes/ for PayTM wizard (e.g. TP_PAYTM_TXN_*.py).

ALTER TABLE paytm_merchants
ADD COLUMN IF NOT EXISTS executable_relative_path varchar(512) NULL;

COMMENT ON COLUMN paytm_merchants.executable_relative_path IS
  'Relative path under b_auto repo root for run_paytm_bot.py --thin-script (e.g. tp_127_executabes/TP_PAYTM_TXN_FOO.py).';
