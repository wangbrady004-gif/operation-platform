## `run_paytm_bot.py` (copy into `b_auto`)

Upstream `b_auto` uses thin runners such as `tp_127_executabes/TP_PAYTM_TXN_*.py` plus `tp_settings_2_0.PAYTM[...]`. The ops worker expects **`tp_127_executabes/run_paytm_bot.py`** to exist so it can:

- merge an optional decrypted merchant JSON (`--config-file`) into `PAYTM[profile]` before executing the thin file;
- when `--defer-anchors` is set, poll `GET …/internal/jobs/:jobId/anchor` with `INTERNAL_API_TOKEN` for order id / customer name once the PayTM flows ask for anchors (after manual OTP login).

**Install:** copy [`run_paytm_bot.py`](./run_paytm_bot.py) to:

`<your-b_auto>/tp_127_executabes/run_paytm_bot.py`

Requirements: same as your bank bots (`requests` is typically already installed for `trustpay_curl_2_0`).

**Matchers** (synced with current `tp_127_paytm*_main.py`):

| Kind | Detected substring (prompt lowercased) |
|------|--------------------------------------|
| Login pause | `login maully`, `login manually` |
| Customer anchor | `enter last customer name` |
| Transaction anchor | `enter last transaction id` |

`tp_127_paytm_trj_main.py` only uses the transaction prompt (no customer `input()`). Use **`--mode txn`** with TRJ thin scripts.

If your core changes verbatim strings, edit `_loginish`, `_customerish`, and `_transactionish` in [`run_paytm_bot.py`](./run_paytm_bot.py).

**Disclaimer:** Older / forked cores may differ; extend the matchers if needed.
