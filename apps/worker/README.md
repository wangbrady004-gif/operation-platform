Install and run from this directory:

```bash
# From apps/worker (recommended)
cp .env.example .env
# Edit .env — INTERNAL_API_TOKEN must match apps/api/.env exactly.

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m worker
```

If you see `Connection refused` to port `8899`, the Nest API is not listening — start **`apps/api`** (or fix `OPS_API_URL`).

Environment:

| Variable | Default | Meaning |
|----------|---------|---------|
| `OPS_API_URL` | `http://127.0.0.1:8899` | NestJS base URL |
| `INTERNAL_API_TOKEN` | *(required)* | Same secret as `apps/api/.env` `INTERNAL_API_TOKEN` |
| `B_AUTO_REPO_ROOT` | auto | Explicit bot root (`tp_settings_2_0.py`). If unset: walk parents from the worker package, then **`integrations/b_auto_bot`** in this monorepo |
| `OPS_POLL_INTERVAL` | `2` | Seconds to sleep when no job is available |
| `OPS_LOG_BATCH` | `5` | Lines to batch before `POST /internal/jobs/:id/logs` |

Logs from the subprocess are streamed with **`python -u`** and **`PYTHONUNBUFFERED=1`** so the job UI and SSE see output promptly (heavy Selenium/driver logging still depends on the bot scripts).
