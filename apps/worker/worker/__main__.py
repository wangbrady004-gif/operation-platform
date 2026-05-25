"""
Laptop worker: long-poll NestJS for jobs, run Python scripts at b_auto repo root, stream logs back.

Thin bots (tp_127_executabes/*.py) run as subprocess argv = [python, -u, script] unless the job is the PayTM wrapper.
Real PayTM/Selenium automation still lives outside this repo historically (b_auto). If you omit
B_AUTO_REPO_ROOT, we use integrations/b_auto_bot (committed stub + copied PayTM cores).

Env:
  OPS_API_URL          — API base (default http://127.0.0.1:8899)
  INTERNAL_API_TOKEN   — must match API .env (required)
  B_AUTO_REPO_ROOT     — optional; directory containing tp_settings_2_0.py (defaults: walk parents from this package, then integrations/b_auto_bot)
  OPS_POLL_INTERVAL    — idle seconds when no job (default 2)
  OPS_LOG_BATCH        — lines per POST to /internal/jobs/:id/logs (default 5)
  OPS_CANCEL_POLL_SEC  — min seconds between «stop requested» polls while subprocess runs (default 0.35)

Start the ops API on OPS_API_URL before the worker; otherwise poll errors (connection refused) are normal.
Child bot output is forced unbuffered (python -u + PYTHONUNBUFFERED) so logs and SSE streaming work.
"""

from __future__ import annotations

import json
import os
import queue
import shlex
import subprocess
import sys
import threading
import time
from pathlib import Path

import requests

_STDOUT_SENTINEL = object()

def _enqueue_stdout_lines(pipe, out_q: queue.Queue) -> None:
    try:
        for line in pipe:
            out_q.put(line.rstrip("\n"))
    finally:
        out_q.put(_STDOUT_SENTINEL)


def try_load_dotenv() -> None:
    """
    Load .env files for local dev.

    We *prefer* python-dotenv when available, but we also support a minimal
    KEY=VALUE parser so the worker still picks up OPS_API_URL / INTERNAL_API_TOKEN
    even if python-dotenv isn't installed in the active venv.
    """
    load_dotenv = None
    try:
        from dotenv import load_dotenv as _load_dotenv  # type: ignore

        load_dotenv = _load_dotenv
    except ImportError:
        load_dotenv = None

    def _minimal_load(p: Path, *, override: bool) -> None:
        try:
            for raw in p.read_text(encoding="utf-8").splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if not k:
                    continue
                if override:
                    os.environ[k] = v
                else:
                    # Do not override existing env
                    os.environ.setdefault(k, v)
        except OSError:
            return

    here = Path(__file__).resolve()
    candidates = [
        Path.cwd() / ".env",
        here.parents[1] / ".env",  # apps/worker/.env — typical when cd apps/worker
        here.parent / ".env",  # apps/worker/worker/.env (alongside package)
        here.parents[2] / ".env",  # apps/.env
    ]
    for p in candidates:
        if p.is_file():
            if load_dotenv:
                # In local dev, prefer .env values over whatever is exported in the shell.
                load_dotenv(p, override=True)
            else:
                _minimal_load(p, override=True)


try_load_dotenv()

API_URL = os.environ.get("OPS_API_URL", "http://127.0.0.1:8899").rstrip("/")
INTERNAL_TOKEN = os.environ.get("INTERNAL_API_TOKEN", "").strip()
IDLE_SEC = float(os.environ.get("OPS_POLL_INTERVAL", "2"))
LOG_BATCH = int(os.environ.get("OPS_LOG_BATCH", "5"))
CANCEL_POLL_SEC = max(
    0.15,
    float(os.environ.get("OPS_CANCEL_POLL_SEC", "0.35")),
)


class WorkerCancelled(Exception):
    """Operator cancelled during command setup (before subprocess spawn)."""

    __slots__ = ("cleanup_paths",)

    def __init__(self, cleanup_paths: list[Path]):
        self.cleanup_paths = cleanup_paths
        super().__init__()


# Must match Nest `PAYTM_WRAPPER_SCRIPT` — only this entrypoint receives --mode / --config-file.
PAYTM_WRAPPER_REL = "tp_127_executabes/run_paytm_bot.py"
GOOGLE_WRAPPER_REL = "tp_127_executabes/run_google_bot.py"


def default_repo_root() -> Path:
    """Find a repo root by locating tp_settings_2_0.py above this file (e.g. co-located b_auto)."""
    here = Path(__file__).resolve()
    for d in here.parents:
        try:
            if (d / "tp_settings_2_0.py").is_file():
                return d
        except OSError:
            continue
    raise FileNotFoundError(
        "missing tp_settings_2_0.py in parent dirs (and no B_AUTO_REPO_ROOT).",
    )


def integrations_vendor_root() -> Path | None:
    """Monorepo integrations/b_auto_bot — vendored PayTM tree (committed stub + copied cores)."""
    pkg = Path(__file__).resolve().parent
    for ancestor in pkg.parents:
        candidate = ancestor / "integrations" / "b_auto_bot"
        try:
            if (candidate / "tp_settings_2_0.py").is_file():
                return candidate.resolve()
        except OSError:
            continue
    return None


_PAYTM_VENDOR_FILES = (
    "tp_127_bank_mains/tp_127_paytm_main.py",
    "tp_127_bank_mains/tp_127_paytm_trj_main.py",
    "tp_127_bank_mains/tp_127_paytm_new_main.py",
    "trustpay_curl_2_0.py",
    "tp_telegram_bot_2_0.py",
)


def maybe_warn_paytm_vendor_incomplete(root: Path) -> None:
    missing = [rel for rel in _PAYTM_VENDOR_FILES if not (root / rel).is_file()]
    if missing:
        print(
            "[worker] warning: integrations/b_auto_bot missing files (Section E — copy from b_auto): "
            + "; ".join(missing),
            file=sys.stderr,
        )


def resolve_repo_root() -> tuple[Path, str]:
    """
    Returns (root, source_tag).
    source_tag is explicit | walk | integrations.
    Prefer B_AUTO_REPO_ROOT, ancestor walk from this package, then integrations/b_auto_bot.
    """
    override = os.environ.get("B_AUTO_REPO_ROOT", "").strip()
    root: Path
    tag: str

    if override:
        root = Path(override).resolve()
        tag = "explicit"
    else:
        try:
            root = default_repo_root().resolve()
            tag = "walk"
        except FileNotFoundError:
            iv = integrations_vendor_root()
            if iv is None:
                print(
                    "[worker] FATAL: no bot repo root: set B_AUTO_REPO_ROOT "
                    "(directory with tp_settings_2_0.py), or clone this monorepo with "
                    "integrations/b_auto_bot intact, or nest your checkout so an ancestor "
                    "contains tp_settings_2_0.py.",
                    file=sys.stderr,
                )
                sys.exit(1)
            root = iv
            tag = "integrations"

    marker = root / "tp_settings_2_0.py"
    if not marker.is_file():
        print(
            f"[worker] FATAL: bot root invalid (missing tp_settings_2_0.py): {root}",
            file=sys.stderr,
        )
        sys.exit(1)
    return root, tag


def headers() -> dict[str, str]:
    return {"X-Internal-Token": INTERNAL_TOKEN}


def fetch_next(session: requests.Session) -> dict | None:
    r = session.get(f"{API_URL}/internal/jobs/next", headers=headers(), timeout=30)
    r.raise_for_status()
    data = r.json()
    job = data.get("job")
    return job if isinstance(job, dict) else None


def fetch_job_state_counts(session: requests.Session) -> dict[str, int] | None:
    try:
        r = session.get(
            f"{API_URL}/internal/jobs/stats",
            headers=headers(),
            timeout=10,
        )
        if not r.ok:
            return None
        raw = r.json().get("counts")
        if not isinstance(raw, dict):
            return None
        out: dict[str, int] = {}
        for k, v in raw.items():
            if not isinstance(k, str):
                continue
            try:
                out[k] = int(float(v))
            except (TypeError, ValueError):
                continue
        return out if out else None
    except (requests.RequestException, ValueError, TypeError):
        return None


def post_logs(session: requests.Session, job_id: str, lines: list[str]) -> None:
    if not lines:
        return
    r = session.post(
        f"{API_URL}/internal/jobs/{job_id}/logs",
        headers={**headers(), "Content-Type": "application/json"},
        json={"lines": lines},
        timeout=60,
    )
    r.raise_for_status()


def cancellation_requested(session: requests.Session, job_id: str) -> bool:
    try:
        cr = session.get(
            f"{API_URL}/internal/jobs/{job_id}/cancellation-requested",
            headers=headers(),
            timeout=15,
        )
        if not cr.ok:
            return False
        body = cr.json()
        return isinstance(body, dict) and bool(body.get("requested"))
    except requests.RequestException:
        return False


def _bootstrap_log_lines(job_id: str, argv: list[str], repo_root: Path) -> list[str]:
    try:
        cmd = shlex.join(argv)
    except Exception:
        cmd = " ".join(argv)
    if len(cmd) > 9000:
        cmd = cmd[:9000] + "…"
    return [
        f"[worker] job={job_id} subprocess starting line-buffered/unbuffered (python -u, PYTHONUNBUFFERED=1).",
        f"[worker] cwd={repo_root}",
        f"[worker] cmd={cmd}",
    ]


def finish(
    session: requests.Session,
    job_id: str,
    exit_code: int,
    error: str | None = None,
    *,
    cancelled: bool = False,
) -> None:
    payload: dict[str, object] = {"exitCode": exit_code}
    if error:
        payload["error"] = error
    if cancelled:
        payload["cancelled"] = True
    r = session.post(
        f"{API_URL}/internal/jobs/{job_id}/finish",
        headers={**headers(), "Content-Type": "application/json"},
        json=payload,
        timeout=30,
    )
    # If the API already finished this job (another worker / retry), don't loop forever.
    if r.status_code == 409:
        return
    r.raise_for_status()


def _paytm_diag_lines(payload: dict) -> list[str]:
    """Sanitized PayTM job summary for job logs (no anchor text)."""
    mode = payload.get("mode")
    profile = str(payload.get("profile") or "").strip()
    defer = bool(payload.get("deferAnchors"))
    thin = str(payload.get("thinScriptRelativePath") or "").strip()
    mid = payload.get("merchantId")
    mid_s = str(mid).strip() if mid is not None else ""
    lines = [
        f"[worker] paytm: mode={mode} profile={profile!r} deferAnchors={defer}",
        f"[worker] paytm: thinScriptRelativePath={thin or '(missing)'} merchantId={mid_s or 'none'}",
    ]
    if not defer:
        tx = str(payload.get("lastTransactionId") or "").strip()
        cn = str(payload.get("lastCustomerName") or "").strip()
        lines.append(
            f"[worker] paytm: anchor lengths txn_id={len(tx)} "
            f"customer_name={len(cn) if mode == 'name' else 'n/a'} (values not logged)",
        )
    return lines


def build_command(
    session: requests.Session,
    job: dict,
    repo_root: Path,
    job_id: str,
) -> tuple[list[str], list[Path]]:
    rel = str(job["scriptRelativePath"])
    script = (repo_root / rel).resolve()
    argv: list[str] = [sys.executable, "-u", str(script)]
    cleanup: list[Path] = []

    payload = job.get("payload")
    if isinstance(payload, dict) and payload.get("kind") == "paytm":
        if rel.strip() != PAYTM_WRAPPER_REL:
            raise ValueError(
                f"paytm payload is only valid for script {PAYTM_WRAPPER_REL!r} (got {rel!r})",
            )
        mode = payload.get("mode")
        profile = str(payload.get("profile") or "").strip()
        defer = bool(payload.get("deferAnchors"))
        if mode not in ("txn", "name") or not profile:
            raise ValueError(
                "Invalid paytm payload: require mode (txn|name), profile",
            )
        thin_rel = str(payload.get("thinScriptRelativePath") or "").strip()
        if not thin_rel:
            raise ValueError(
                "Invalid paytm payload: thinScriptRelativePath is required (vendored TP_PAYTM_*.py from b_auto)",
            )
        if not defer:
            last_tx = str(payload.get("lastTransactionId") or "").strip()
            if not last_tx:
                raise ValueError(
                    "Invalid paytm payload: require lastTransactionId when deferAnchors is false",
                )
        argv.extend(
            [
                "--mode",
                str(mode),
                "--profile",
                profile,
                "--thin-script",
                thin_rel,
            ],
        )
        if defer:
            argv.append("--defer-anchors")
        else:
            argv.extend(
                [
                    "--last-transaction-id",
                    last_tx,
                ],
            )
            if mode == "name":
                cn_req = str(payload.get("lastCustomerName") or "").strip()
                if not cn_req:
                    raise ValueError(
                        "Invalid paytm payload: lastCustomerName required when mode=name and deferAnchors is false",
                    )
                argv.extend(
                    [
                        "--last-customer-name",
                        cn_req,
                    ],
                )

        mid = payload.get("merchantId")
        if mid:
            if cancellation_requested(session, job_id):
                raise WorkerCancelled(cleanup)
            print(
                f"[worker] job={job_id}: fetching encrypted merchant snapshot from API …",
                flush=True,
            )
            r = session.get(
                f"{API_URL}/internal/paytm-merchants/{str(mid).strip()}/snapshot",
                headers=headers(),
                timeout=60,
            )
            r.raise_for_status()
            snap = r.json()
            if not isinstance(snap, dict):
                raise ValueError("merchant snapshot JSON must be an object")
            cfg_path = repo_root / f".ops-merchant-{job_id}.json"
            cfg_path.write_text(
                json.dumps(snap, ensure_ascii=False),
                encoding="utf-8",
            )
            cleanup.append(cfg_path)
            argv.extend(["--config-file", str(cfg_path)])
            print(
                f"[worker] job={job_id}: merchant snapshot written keys={list(snap.keys())} → {cfg_path.name}",
                flush=True,
            )

    elif isinstance(payload, dict) and payload.get("kind") == "google":
        if rel.strip() != GOOGLE_WRAPPER_REL:
            raise ValueError(
                f"google payload is only valid for script {GOOGLE_WRAPPER_REL!r} (got {rel!r})",
            )
        mid = payload.get("merchantId")
        profile = str(payload.get("profile") or "").strip()
        last_utr = str(payload.get("lastUtr") or "").strip()
        if not mid:
            raise ValueError("Invalid google payload: merchantId is required")
        if not profile:
            raise ValueError("Invalid google payload: profile is required")
        if not last_utr:
            raise ValueError("Invalid google payload: lastUtr is required")

        if cancellation_requested(session, job_id):
            raise WorkerCancelled(cleanup)
        print(
            f"[worker] job={job_id}: google: fetching merchant snapshot for profile={profile!r} …",
            flush=True,
        )
        r = session.get(
            f"{API_URL}/internal/paytm-merchants/{str(mid).strip()}/snapshot",
            headers=headers(),
            timeout=60,
        )
        r.raise_for_status()
        snap = r.json()
        if not isinstance(snap, dict):
            raise ValueError("merchant snapshot JSON must be an object")
        cfg_path = repo_root / f".ops-merchant-{job_id}.json"
        cfg_path.write_text(
            json.dumps(snap, ensure_ascii=False),
            encoding="utf-8",
        )
        cleanup.append(cfg_path)
        argv.extend([
            "--config-file", str(cfg_path),
            "--last-utr", last_utr,
            "--profile", profile,
        ])
        print(
            f"[worker] job={job_id}: google snapshot written → {cfg_path.name}",
            flush=True,
        )

    return argv, cleanup


def run_job(session: requests.Session, job: dict, repo_root: Path) -> None:
    job_id = str(job["id"])
    rel = str(job["scriptRelativePath"])
    script = (repo_root / rel).resolve()
    try:
        script.relative_to(repo_root)
    except ValueError:
        finish(session, job_id, 1, error="Script path escapes repo root")
        return

    if not script.is_file():
        finish(session, job_id, 1, error=f"Script not found: {script}")
        return

    print(
        f"[worker] claimed job id={job_id} — preparing command ({rel}) …",
        flush=True,
    )

    if cancellation_requested(session, job_id):
        finish(session, job_id, 130, error="Stopped by operator", cancelled=True)
        return

    cleanup_paths: list[Path] = []
    try:
        argv, cleanup_paths = build_command(session, job, repo_root, job_id)
    except WorkerCancelled as wc:
        for p in wc.cleanup_paths:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
        finish(session, job_id, 130, error="Stopped by operator", cancelled=True)
        return
    except (ValueError, requests.RequestException) as e:
        finish(session, job_id, 1, error=str(e))
        return

    if cancellation_requested(session, job_id):
        for p in cleanup_paths:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass
        finish(session, job_id, 130, error="Stopped by operator", cancelled=True)
        return

    env = {
        **os.environ,
        "PYTHONPATH": str(repo_root),
        "PYTHONUNBUFFERED": "1",
        "OPS_JOB_ID": job_id,
        "OPS_API_URL": API_URL,
    }
    if INTERNAL_TOKEN:
        env["INTERNAL_API_TOKEN"] = INTERNAL_TOKEN
    cmd_preview = argv[:8]
    print(
        f"[worker] job={job_id} {' '.join(cmd_preview)}{' …' if len(argv) > 8 else ''} cwd={repo_root}",
        flush=True,
    )

    proc = None
    try:
        try:
            boot = _bootstrap_log_lines(job_id, argv, repo_root)
            pl = job.get("payload")
            if isinstance(pl, dict) and pl.get("kind") == "paytm":
                boot.extend(_paytm_diag_lines(pl))
            post_logs(session, job_id, boot)
        except requests.RequestException as e:
            finish(session, job_id, 1, error=f"Log upload failed before spawn: {e}")
            return
        try:
            proc = subprocess.Popen(
                argv,
                cwd=str(repo_root),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                env=env,
            )
        except OSError as e:
            finish(session, job_id, 1, error=f"Spawn failed: {e}")
            return

        assert proc.stdout is not None
        line_q: queue.Queue = queue.Queue()
        threading.Thread(
            target=_enqueue_stdout_lines,
            args=(proc.stdout, line_q),
            daemon=True,
        ).start()
        try:
            post_logs(
                session,
                job_id,
                [f"[worker] pid={proc.pid} — streaming stdout/stderr to ops…"],
            )
        except requests.RequestException as e:
            if proc.poll() is None:
                proc.kill()
            finish(session, job_id, 1, error=f"Log upload failed after spawn: {e}")
            return
        batch: list[str] = []
        last_cancel_poll = 0.0
        cancel_kill = False
        stop_logged = False
        try:
            while True:
                now_m = time.monotonic()
                if now_m - last_cancel_poll >= CANCEL_POLL_SEC:
                    try:
                        cr = session.get(
                            f"{API_URL}/internal/jobs/{job_id}/cancellation-requested",
                            headers=headers(),
                            timeout=15,
                        )
                        if cr.ok:
                            body = cr.json()
                            if isinstance(body, dict) and body.get("requested"):
                                cancel_kill = True
                                if proc.poll() is None:
                                    proc.kill()
                                if not stop_logged:
                                    stop_logged = True
                                    try:
                                        post_logs(
                                            session,
                                            job_id,
                                            [
                                                "[worker] Operator requested stop — terminating bot subprocess.",
                                            ],
                                        )
                                    except requests.RequestException:
                                        pass
                    except requests.RequestException:
                        pass
                    last_cancel_poll = now_m

                try:
                    item = line_q.get(timeout=0.5)
                except queue.Empty:
                    continue

                if item is _STDOUT_SENTINEL:
                    if batch:
                        post_logs(session, job_id, batch)
                        batch.clear()
                    code = proc.wait()
                    if cancel_kill:
                        finish(
                            session,
                            job_id,
                            130,
                            error="Stopped by operator",
                            cancelled=True,
                        )
                    else:
                        finish(session, job_id, int(code))
                    break

                batch.append(item)
                if len(batch) >= LOG_BATCH:
                    post_logs(session, job_id, batch)
                    batch.clear()

        except requests.RequestException as e:
            if proc.poll() is None:
                proc.kill()
            finish(session, job_id, 1, error=f"Log upload failed: {e}")
            return
    finally:
        if proc is not None and proc.poll() is None:
            proc.kill()
        for p in cleanup_paths:
            try:
                p.unlink(missing_ok=True)
            except OSError:
                pass


def main() -> None:
    if not INTERNAL_TOKEN:
        print("[worker] INTERNAL_API_TOKEN is required", file=sys.stderr)
        sys.exit(1)

    repo_root, repo_source = resolve_repo_root()
    print(f"[worker] API={API_URL} repo={repo_root}", flush=True)
    if repo_source == "integrations":
        print(
            "[worker] Using integrations/b_auto_bot vendored bot root.",
            flush=True,
        )
        maybe_warn_paytm_vendor_incomplete(repo_root)

    session = requests.Session()
    last_idle_log = 0.0
    while True:
        try:
            job = fetch_next(session)
        except requests.RequestException as e:
            print(
                f"[worker] poll error: {e} — is the API up on {API_URL}?",
                file=sys.stderr,
            )
            time.sleep(IDLE_SEC)
            continue

        if not job:
            now_m = time.monotonic()
            if now_m - last_idle_log >= 45.0:
                counts = fetch_job_state_counts(session)
                if counts:
                    q = int(counts.get("queued") or 0)
                    st = int(counts.get("starting") or 0)
                    r = int(counts.get("running") or 0)
                    wait = q + st
                    print(
                        "[worker] idle — this Python process has no session to attach right now.",
                        flush=True,
                    )
                    print(
                        f"[worker]   DB snapshot: waiting_for_worker={wait} "
                        f"(legacy_queued={q} + starting={st}); "
                        f"sessions_in_state_running={r}; full={counts}",
                        flush=True,
                    )
                    if r > 0 and wait == 0:
                        print(
                            "[worker]   ⟹ Interpretation: rows are «running» in Postgres but nothing "
                            "is waiting for THIS worker to claim — typical causes: (1) another "
                            "`python -m worker` already claimed them or exited mid-run without finishing; "
                            "(2) stale «running» after a crash. Fix: quit duplicate worker terminals; "
                            "in ops UI as admin open that session → «Reset for worker retry».",
                            flush=True,
                        )
                    elif wait == 0 and r == 0:
                        print(
                            "[worker]   Start a session from ops UI; this worker will print "
                            "«attached session id=…» when it picks one up.",
                            flush=True,
                        )
                else:
                    print(
                        "[worker] idle — API reachable; waiting for sessions from ops UI …",
                        flush=True,
                    )
                last_idle_log = now_m
            time.sleep(IDLE_SEC)
            continue

        # Safety: API should only return running jobs here (claimed).
        if str(job.get("state", "")).lower() != "running":
            time.sleep(IDLE_SEC)
            continue

        last_idle_log = time.monotonic()

        jid = job.get("id") or '?'
        print(
            f"[worker] attached session id={jid} — spawning subprocess …",
            flush=True,
        )
        try:
            run_job(session, job, repo_root)
        except requests.RequestException as e:
            print(f"[worker] job error: {e}", file=sys.stderr)
        except Exception as e:  # noqa: BLE001 — surface unexpected errors
            print(f"[worker] unexpected: {e}", file=sys.stderr)

        time.sleep(0.5)


if __name__ == "__main__":
    main()
