# Ops platform

> **Standalone ops UI / API / worker** — real PayTM/Selenium bots still expect a **`tp_settings_2_0.py` + `tp_127_executabes/`** tree (historically **`b_auto`**). **`B_AUTO_REPO_ROOT`** → that folder when it lives outside this repo; otherwise the worker resolves **`integrations/b_auto_bot`** (see **`integrations/b_auto_bot/README.md`**) after walking ancestors for **`tp_settings_2_0.py`**. Align **`PORT` / `OPS_API_URL` / `INTERNAL_API_TOKEN`** across API, web, and worker.

Stack: **Next.js** (UI), **NestJS** (API), **PostgreSQL** (persistent jobs + logs + users + audit), **Python worker** (runs repo scripts), **JWT** (ops login).

## Prerequisites

- Node 20+ recommended, Python 3.9+ for the worker
- Docker (for Postgres) **or** your own PostgreSQL instance

## 1. Start PostgreSQL

From `ops-platform/`:

```bash
docker compose up -d
```

Connection string for local dev:

`postgresql://ops:ops@127.0.0.1:5432/ops`

## 2. API (`apps/api`)

```bash
cd ops-platform/apps/api
cp .env.example .env
# edit .env: DATABASE_URL, JWT_SECRET, INIT_ADMIN_PASSWORD, INTERNAL_API_TOKEN,
#            MERCHANT_ENCRYPTION_KEY (≥16 chars — required for paytm merchant admin writes)
npm install
npm run start:dev
```

- **First boot:** if the `users` table is empty and `INIT_ADMIN_PASSWORD` is set, an **admin** user is created (`INIT_ADMIN_EMAIL`, default `admin@localhost`).
- **Internal worker auth:** `INTERNAL_API_TOKEN` must match the worker `.env`.

**Useful endpoints**

| Endpoint | Who |
|----------|-----|
| `POST /auth/login` | Public |
| `GET /auth/me` | JWT |
| `POST /auth/users` | Admin — create viewer / operator / admin |
| `GET /auth/audit` | Admin |
| `POST /jobs` | Operator or admin — `scriptRelativePath` only for native `tp_127_executabes/*.py`, **or** optional `paytm` body with `tp_127_executabes/run_paytm_bot.py` (wrapper you add to b_auto) |
| `GET /jobs`, `GET /jobs/:id` | Viewer+ |
| `GET /jobs/:id/logs/stream` (SSE) | Viewer+ |
| `GET /paytm-merchants` | Viewer+ — id, profile, mobile, runner path (no secrets) |
| `GET /paytm-merchants/operators/:id/login-assist` | Operator or admin — mobile + password for manual login (audit) |
| `GET/POST /paytm-merchants/admin` | Admin — list / create PayTM merchant rows (encrypted secrets) |
| `GET /paytm-merchants/admin/:id` | Admin — decrypted fields for login copy + audit `view_secrets` |
| `GET /internal/jobs/*` | `X-Internal-Token: <INTERNAL_API_TOKEN>` |
| `GET /internal/paytm-merchants/:id/snapshot` | Worker — decrypted JSON for the PayTM **wrapper** `--config-file` |

## 3. Web (`apps/web`)

```bash
cd ops-platform/apps/web
cp .env.example .env.local
npm install
npm run dev
# http://127.0.0.1:3001
```

Open **`/access`** (workspace gate) with the bootstrap admin credentials, then **`/merchant-run`** for merchant sessions. Administrators use **`/merchants`** for profiles and **`/team`** to onboard operators and viewers (API: **`POST /auth/users`** — admin only). Operators use credential assist from **`GET …/operators/:id/login-assist`** on the merchants API route (audit-logged).

Copy **`templates/b_auto_tp_127_executabes/run_paytm_bot.py`** into **`b_auto/tp_127_executabes/run_paytm_bot.py`** — the worker passes `--thin-script`, merges DB merchant JSON when `merchantId` is set, and sets `INTERNAL_API_TOKEN` for deferred anchor polling in that wrapper.

The UI stores the JWT in an **httpOnly cookie** (`ops_access_token`) via `POST /api/auth/login`.

## 4. Worker (`apps/worker`)

```bash
cd ops-platform/apps/worker
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp worker/.env.example worker/.env
# Edit worker/.env: OPS_API_URL (must match API PORT), INTERNAL_API_TOKEN, and
# B_AUTO_REPO_ROOT if you want a bot root outside the monorepo (default: integrations/b_auto_bot inside this repo).
export INTERNAL_API_TOKEN=same-as-api
python -m worker
```

For jobs whose payload is **`paytm`** (wrapper flow only — script must be `tp_127_executabes/run_paytm_bot.py`), the worker appends CLI args and, if `merchantId` is present, calls `GET /internal/paytm-merchants/:id/snapshot`, writes a temporary JSON file under the bot root (**`integrations/b_auto_bot`** or **`B_AUTO_REPO_ROOT`**), and passes `--config-file` (removed after the job). Native thin jobs have **no payload** — the worker runs `python` on that path with only `cwd`/`PYTHONPATH` set. Set `MERCHANT_ENCRYPTION_KEY` in the API `.env` before using merchant CRUD.

## Roles

| Role | Can |
|------|-----|
| `viewer` | List jobs, view details, watch live SSE logs |
| `operator` | Enqueue jobs, cancel **queued** jobs |
| `admin` | Above + create users, PayTM merchant records, read audit log |

## Production notes

- Set `NODE_ENV=production` and **turn off** TypeORM `synchronize` (use migrations). Apply [`db-production-migrations/001-job-payload-paytm-merchants.sql`](./db-production-migrations/001-job-payload-paytm-merchants.sql) (jobs `payload` column + `paytm_merchants` table); [`002-job-paytm-anchor-input.sql`](./db-production-migrations/002-job-paytm-anchor-input.sql) if not already applied; [`003-paytm-merchant-runner-path.sql`](./db-production-migrations/003-paytm-merchant-runner-path.sql) (`paytm_merchants.executable_relative_path`); and [`004-paytm-merchant-portal-listing-mid.sql`](./db-production-migrations/004-paytm-merchant-portal-listing-mid.sql) (`paytm_merchants.portal_listing_mid`). For **user suspend/resume**, apply [`007-users-status-column.sql`](./db-production-migrations/007-users-status-column.sql) (`users.status`).
- Rotate `JWT_SECRET`, `INTERNAL_API_TOKEN`, `MERCHANT_ENCRYPTION_KEY`, DB password, and admin password.
- Do not run merchant automation against production bank credentials from unsecured laptops without policy review.
