#!/usr/bin/env python3
"""
Ops PayTM shim: merge PAYTM overlays, optional deferred anchors (Nest internal API),
then run a thin TP_PAYTM_* script via runpy.

Canonical copy: ops-platform-standalone/integrations/b_auto_bot/tp_127_executabes/run_paytm_bot.py
cwd + PYTHONPATH must be `integrations/b_auto_bot` when used from that layout.

Input prompts matched: tp_127_bank_mains/tp_127_paytm*_main.py
  - Login pause: "login maully" (main, trj) or "login manually" (new)
  - Anchors: "Enter last CUSTOMER NAME:" / "Enter last TRANSACTION ID:" where present.
  - tp_127_paytm_trj_main: use --mode txn (no customer-name input()).
"""

from __future__ import annotations

import argparse
import builtins
import json
import os
import pathlib
import runpy
import sys
import time
import traceback

try:
    import requests
except ImportError:
    print("requests is required (pip install requests)", file=sys.stderr)
    sys.exit(1)


def merge_overlay(profile: str, config_path: str | None) -> None:
    import tp_settings_2_0 as ts

    pk = profile.strip()
    base = ts.PAYTM.get(pk)
    merged: dict = dict(base) if isinstance(base, dict) else {}
    if config_path:
        raw = pathlib.Path(config_path).read_text(encoding="utf-8")
        data = json.loads(raw)
        if not isinstance(data, dict):
            raise SystemExit("--config-file must contain a JSON object")
        for k, v in data.items():
            merged[str(k)] = str(v)
    ts.PAYTM[pk] = merged
    if "url" not in ts.PAYTM or not str(ts.PAYTM.get("url") or "").strip():
        print(
            "[run_paytm_bot] WARNING: PAYTM['url'] missing or empty after overlay — "
            "tp_127_paytm_main / trj may fail at module import.",
            file=sys.stderr,
            flush=True,
        )


def _poll_anchors(ops_api: str, job_id: str, internal_token: str) -> dict[str, str]:
    url = f"{ops_api.rstrip('/')}/internal/jobs/{job_id}/anchor"
    headers = {"X-Internal-Token": internal_token}
    interval = float(os.environ.get("OPS_ANCHOR_POLL_SEC", "1.5"))
    print(f"[run_paytm_bot] Waiting for anchors on job {job_id} …", flush=True)
    while True:
        try:
            r = requests.get(url, headers=headers, timeout=30)
            if r.status_code >= 400:
                print(
                    f"[run_paytm_bot] anchor poll {r.status_code}: {r.text[:300]}",
                    flush=True,
                )
                time.sleep(interval)
                continue
            js = r.json()
        except requests.RequestException as e:
            print(f"[run_paytm_bot] anchor poll error: {e}", flush=True)
            time.sleep(interval)
            continue
        if js.get("ready"):
            tid = str(js.get("lastTransactionId") or "").strip()
            nid = str(js.get("lastCustomerName") or "").strip()
            print("[run_paytm_bot] Anchors received.", flush=True)
            return {"lastTransactionId": tid, "lastCustomerName": nid}
        time.sleep(interval)


def _loginish(prompt_lc: str) -> bool:
    """b_auto: input('login maully') main+trj, input('login manually') new_main."""
    if prompt_lc.startswith(">>>>"):
        return True
    return (
        "login maully" in prompt_lc
        or "login manually" in prompt_lc
    )


def _customerish(prompt_lc: str) -> bool:
    """b_auto: input('Enter last CUSTOMER NAME:') — not used by tp_127_paytm_trj_main."""
    return "enter last customer name" in prompt_lc


def _transactionish(prompt_lc: str) -> bool:
    """b_auto: input('Enter last TRANSACTION ID:')."""
    return "enter last transaction id" in prompt_lc


def build_input_hook(
    *,
    mode: str,
    defer: bool,
    direct_anchor: dict[str, str],
) -> object:
    real_input = builtins.input
    cache: dict[str, str] | None = direct_anchor.copy() if direct_anchor else None
    polled = False
    debug_input = os.environ.get("OPS_PAYTM_DEBUG_INPUT", "").strip() in (
        "1",
        "true",
        "yes",
    )

    def _defer_poll_once() -> dict[str, str]:
        nonlocal cache, polled
        if polled and cache:
            return cache
        api = os.environ.get("OPS_API_URL", "").strip()
        jid = os.environ.get("OPS_JOB_ID", "").strip()
        tok = os.environ.get("INTERNAL_API_TOKEN", "").strip()
        if not api or not jid or not tok:
            raise SystemExit(
                "defer-anchors needs OPS_API_URL, OPS_JOB_ID, INTERNAL_API_TOKEN env",
            )
        cache = _poll_anchors(api, jid, tok)
        polled = True
        tid = cache.get("lastTransactionId") or ""
        if not tid:
            raise SystemExit("Anchor poll returned empty lastTransactionId.")
        if mode == "name" and not (
            cache.get("lastCustomerName") or ""
        ).strip():
            raise SystemExit("Anchor poll returned empty lastCustomerName (mode=name).")
        return cache

    def hook(prompt=""):
        p = prompt or ""
        pl = p.lower()

        if _loginish(pl):
            print(
                "[run_paytm_bot] input hook: releasing login pause — complete OTP in Chrome, then Enter here",
                flush=True,
            )
            return real_input(
                ">>> After OTP in the Selenium Chrome window (if prompted), press ENTER:",
            )

        if not defer:
            c = cache or {}
            # Match tp_127_paytm_main / tp_127_paytm_new_main: customer prompt before transaction.
            if mode == "name" and _customerish(pl):
                raw = (c.get("lastCustomerName") or "").strip()
                src = "ops_payload" if raw else "stdin"
                print(
                    f"[run_paytm_bot] input hook: CUSTOMER anchor source={src}",
                    flush=True,
                )
                return raw if raw else real_input(p)
            if _transactionish(pl):
                raw_tx = (c.get("lastTransactionId") or "").strip()
                src = "ops_payload" if raw_tx else "stdin"
                print(
                    f"[run_paytm_bot] input hook: TRANSACTION anchor source={src}",
                    flush=True,
                )
                return raw_tx if raw_tx else real_input(p)
            if mode == "txn" and _customerish(pl):
                print(
                    "[run_paytm_bot] input hook: txn mode — skipping stray customer prompt",
                    flush=True,
                )
                return ""
            if debug_input:
                print(
                    f"[run_paytm_bot] input hook: passthrough preview={pl[:120]!r}",
                    flush=True,
                )
            return real_input(p)

        if _customerish(pl) or _transactionish(pl):
            c = _defer_poll_once()
            if mode == "name" and _customerish(pl):
                print(
                    "[run_paytm_bot] input hook: CUSTOMER anchor source=deferred_poll",
                    flush=True,
                )
                return (c.get("lastCustomerName") or "").strip()
            if _transactionish(pl):
                print(
                    "[run_paytm_bot] input hook: TRANSACTION anchor source=deferred_poll",
                    flush=True,
                )
                return (c.get("lastTransactionId") or "").strip()
            if mode == "txn" and _customerish(pl):
                print(
                    "[run_paytm_bot] input hook: txn mode — skipping customer prompt",
                    flush=True,
                )
                return ""

        if debug_input:
            print(
                f"[run_paytm_bot] input hook: passthrough preview={pl[:120]!r}",
                flush=True,
            )
        return real_input(p)

    return hook


def main() -> int:
    ap = argparse.ArgumentParser(description="Ops PayTM bridge")
    ap.add_argument("--mode", choices=("txn", "name"), required=True)
    ap.add_argument("--profile", required=True, help="PAYTM[profile] dict key")
    ap.add_argument(
        "--thin-script",
        required=True,
        help="e.g. tp_127_executabes/TP_PAYTM_TXN_MID.py",
    )
    ap.add_argument(
        "--defer-anchors",
        action="store_true",
        help="Poll ops internal API until operator submits anchors on job page.",
    )
    ap.add_argument("--last-transaction-id")
    ap.add_argument("--last-customer-name")
    ap.add_argument(
        "--config-file",
        help="Merchant JSON overlay from worker snapshot.",
    )
    ns = ap.parse_args()

    job_tag = os.environ.get("OPS_JOB_ID", "").strip()
    print(
        f"[run_paytm_bot] bridge start job_id={job_tag or '(none)'} mode={ns.mode} profile={ns.profile!r} "
        f"defer_anchors={bool(ns.defer_anchors)} thin={ns.thin_script!r}",
        flush=True,
    )

    root = pathlib.Path.cwd().resolve()
    thin = (root / ns.thin_script.strip()).resolve()
    if not thin.is_file():
        print(f"[run_paytm_bot] thin script missing: {thin}", file=sys.stderr)
        return 1

    defer = bool(ns.defer_anchors)
    direct_anchor: dict[str, str] = {}
    if not defer:
        tx = str(ns.last_transaction_id or "").strip()
        if not tx:
            ap.error("--last-transaction-id required unless --defer-anchors")
        direct_anchor["lastTransactionId"] = tx
        if ns.mode == "name":
            cn = str(ns.last_customer_name or "").strip()
            if not cn:
                ap.error(
                    '--last-customer-name required for mode=name when anchors not deferred',
                )
            direct_anchor["lastCustomerName"] = cn

    print(
        f"[run_paytm_bot] anchors_from_cli keys={list(direct_anchor.keys())} (values not logged)",
        flush=True,
    )

    merge_overlay(ns.profile, ns.config_file)

    print(
        "[run_paytm_bot] PAYTM dict merged from tp_settings overlay + merchant --config-file (if any).",
        flush=True,
    )

    builtins.input = build_input_hook(  # type: ignore[assignment]
        mode=ns.mode,
        defer=defer,
        direct_anchor=direct_anchor,
    )

    print(f"[run_paytm_bot] Executing thin script {thin}", flush=True)
    try:
        runpy.run_path(str(thin), run_name="__main__")
        return 0
    except SystemExit as e:
        raise e
    except Exception:
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
