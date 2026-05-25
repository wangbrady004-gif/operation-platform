"""
Vend-safe stub until you paste your real automation settings from upstream.

Import hazard (see integrations/b_auto_bot/README.md): tp_127_paytm_main / tp_127_paytm_trj_main
evaluate PAYTM["url"] at module import time — we keep this top-level sentinel.

Merchant secrets MUST come from ops Postgres + run_paytm_bot --config-file overlay (never commit).
"""

_PAYTM_LOGIN_URL = "https://business.paytm.com"

# Top-level URL read by legacy mains during import — do not delete.
PAYTM: dict = {
    "url": _PAYTM_LOGIN_URL,
}

GOOGLE: dict = {}
