## Vendored PayTM automation root (`integrations/b_auto_bot`)

Set **`B_AUTO_REPO_ROOT`** to this folder, or leave it unset: the worker resolves **`tp_settings_2_0.py`** by walking up from the worker package, then this directory (**`integrations/b_auto_bot`** in the monorepo).

**Thin layout**

| Role | Paths |
|------|------|
| PayTM cores | `tp_127_bank_mains/tp_127_paytm_{main,trj_main,new_main}.py` |
| TrustPay / Telegram | `trustpay_curl_2_0.py`, `tp_telegram_bot_2_0.py` |
| Settings | `tp_settings_2_0.py` (committed **stub** here — extend locally if needed; see F) |
| Thin runners | `tp_127_executabes/TP_PAYTM*.py` (copy **only** these; ~566 others stay out) |
| Ops shim | `tp_127_executabes/run_paytm_bot.py` (repo-owned; **`--config-file`** / defer-anchors) |
| Pip | `requirements-worker-bots.txt` |

Runtime artefacts: **`logs/`** (via `trustpay_curl_2_0` / `tp_telegram_bot_2_0`) — gitignored alongside **`*.pkl`**.

---

### E) Export recipe (no secrets; run locally)

Adjust **`SRC_B_AUTO`** and **`DEST`** on your machine. **`DEST`** should be **`…/ops-platform-standalone/integrations/b_auto_bot`**.

```bash
# Paths
export SRC_B_AUTO="/absolute/path/to/b_auto"   # original clone
export DEST="/absolute/path/to/ops-platform-standalone/integrations/b_auto_bot"

mkdir -p "$DEST/tp_127_bank_mains" "$DEST/tp_127_executabes"

# Core integration modules (vend root)
cp "$SRC_B_AUTO/tp_settings_2_0.py" "$DEST/"                    # or keep ops stub; see F
cp "$SRC_B_AUTO/trustpay_curl_2_0.py" "$DEST/"
cp "$SRC_B_AUTO/tp_telegram_bot_2_0.py" "$DEST/"

# PayTM mains only
cp "$SRC_B_AUTO/tp_127_bank_mains/tp_127_paytm_main.py" "$DEST/tp_127_bank_mains/"
cp "$SRC_B_AUTO/tp_127_bank_mains/tp_127_paytm_trj_main.py" "$DEST/tp_127_bank_mains/"
cp "$SRC_B_AUTO/tp_127_bank_mains/tp_127_paytm_new_main.py" "$DEST/tp_127_bank_mains/"

# PayTM thin runners only (avoid vending all ~566 executables)
find "$SRC_B_AUTO/tp_127_executabes" -maxdepth 1 -type f -name 'TP_PAYTM*.py' \
  -exec cp {} "$DEST/tp_127_executabes/" \;
```

`find` copies only **`TP_PAYTM*.py`**; **`run_paytm_bot.py`** is ops-owned and stays in git. If you ever bulk-copied **`tp_127_executabes/`** over this tree, restore the shim from monorepo: **`integrations/b_auto_bot/tp_127_executabes/run_paytm_bot.py`**.

**One-liner vendor:** **`COPY_PASTE_RUNBOOK.md`** + **`./vendor_paytm_from_b_auto.sh`** (recommended).

Optional empty logs (runtime-created anyway):

```bash
# mkdir -p "$DEST/logs" && touch "$DEST/logs/.gitkeep"
```

**rsync alternative** (relative layout from one tree):

```bash
rsync -a --relative \
  "$SRC_B_AUTO/./tp_settings_2_0.py" \
  "$SRC_B_AUTO/./trustpay_curl_2_0.py" \
  "$SRC_B_AUTO/./tp_telegram_bot_2_0.py" \
  "$SRC_B_AUTO/./tp_127_bank_mains/tp_127_paytm_main.py" \
  "$SRC_B_AUTO/./tp_127_bank_mains/tp_127_paytm_trj_main.py" \
  "$SRC_B_AUTO/./tp_127_bank_mains/tp_127_paytm_new_main.py" \
  "$DEST/../"
# Then sync TP_PAYTM*.py similarly, or pipe find → rsync --files-from
```

**Submodule vs vendored copy:** Prefer a **vendored copy** here so CI and air-gapped workers do not rely on laptop paths or submodule remotes; use a submodule only if you want automatic upstream sync and accept coupling to **`b_auto`**.

---

### F) Secrets strategy (overlay, stub `PAYTM`, import order)

Module **`tp_settings_2_0`** must resolve on **`import tp_settings_2_0`** for **`trustpay_curl_2_0`**, **`tp_telegram_bot_2_0`**, and all three PayTM mains.

**Import-time hazard:** **`tp_127_paytm_main.py`** and **`tp_127_paytm_trj_main.py`** read **`tp_settings_2_0.PAYTM['url']`** (same meaning as **`PAYTM['url']`**) early at module load. **`tp_127_paytm_new_main`** does not read **`PAYTM['url']`** at top level but still imports **`tp_settings_2_0`**. So before those mains load you need either:

- **`PAYTM['url']`** present in **`tp_settings_2_0`** (this repo ships a stub with a harmless placeholder URL), **and/or**
- A merged **`PAYTM[profile]`** from **`--config-file`** delivered **before** the PayTM cores import — if your upstream nests profiles and URLs differently, align **`merge_overlay`** with your **`PAYTM`** shape.

**Thin runner order:** scripts such as **`TP_PAYTM_TXN_*.py`** often **`from tp_127_bank_mains import tp_127_paytm_trj_main`** before any later **`import tp_settings_2_0`** line in the runner body. That pulls PayTM mains (and **`PAYTM['url']`**) on first import — runner line order alone is not enough. **`run_paytm_bot.py`** applies **`merge_overlay`** (imports **`tp_settings_2_0`** and merges **`--config-file`**) **before** **`runpy.run_path`** on the thin script, so settings are updated before the runner executes. Other options include **`importlib.reload(tp_settings_2_0)`** after patching in a parent process, or **`subprocess`** after writing a patched settings snapshot.

On the PayTM success path (names are conceptual), merged **`PAYTM[profile]`** typically contributes fields such as **`bank_id`**, **`company`**, **`api`** (TrustPay **`hit_curl`**), and Telegram **`send_last_utr_PAYTM`** may need **`last_utr_chat_id`**. Thin scripts often assign **`bank = tp_settings_2_0.PAYTM['…']`** without using **`bank`**; execution still reads those keys inside **`execute_change`**.

**Do not** mirror the full upstream **`tp_settings_2_0.py`** plaintext into ops if Postgres already holds merchant config: ship a minimal stub (**`PAYTM['url']`**, empty namespaces as needed) plus runtime **`--config-file`** merges.

**Scrub** **`trustpay_curl_2_0.py`** **and** **`tp_telegram_bot_2_0.py`:** upstream files may embed tokens, mediator URLs, and header material. Treat committed copies as **pipeline-scrubbed** builds, not verbatim laptop exports.
