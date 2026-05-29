# Ops Platform

A control plane for **bank profile automation**: operators queue sessions in the browser, **launcher agents** on their own machines claim work and run scripts locally, and everyone sees live status without polling the database. Secrets stay encrypted in PostgreSQL; the API is the only place that decrypts them for authorized callers.

---

## Architecture

```mermaid
flowchart TB
  subgraph edge["Operator environment"]
    BROWSER["Browser"]
    LAUNCHER["Ops launcher · desktop"]
    BOTS["Local bot tree · scripts / EXEs"]
    LAUNCHER --> BOTS
  end

  subgraph console["Ops console · monorepo"]
    WEB["Web · Next.js :3001"]
    API["API · NestJS :8899"]
    DB[("PostgreSQL")]
    WEB <-->|JWT in httpOnly cookie| API
    API <--> DB
  end

  subgraph remote["Optional"]
    BUILD["Build server · EXE packaging"]
  end

  BROWSER --> WEB
  LAUNCHER -->|launcher key + launcher id| API
  WEB -.->|bank / launcher EXE builds| BUILD

  API -->|SSE| WEB
  WEB -->|EventSource via BFF| BROWSER
```

### Session lifecycle

```mermaid
sequenceDiagram
  participant UI as Web UI
  participant API as API
  participant DB as Database
  participant L as Launcher

  UI->>API: Create bot task (profile, module, settings)
  API->>DB: status = pending
  API-->>UI: SSE task_update

  L->>API: POST claim (launcher key)
  API->>DB: status = running, claimed_by = launcher id
  API-->>L: Task + decrypted profile fields
  API-->>UI: SSE task_update + launcher heartbeat

  Note over L: Runs tp_127_* automation locally

  opt Operator stops
    UI->>API: Delete / stop task
    API->>DB: stop_requested or done
    L->>API: GET stop-requests
    L->>L: Shutdown run
  end

  L->>API: PATCH done
  API->>DB: status = done
  API-->>UI: SSE task_update
```

---

## What each layer does

| Layer | Role |
|--------|------|
| **Web** | Ops Console UI: sign-in, dashboard, live **Run Session** board, **Directory** (bank profiles), **Team** (users). Server routes proxy the API so tokens stay in httpOnly cookies. |
| **API** | Global JWT guard, role checks, bank profile vault (AES-GCM), bot task queue, launcher registry, audit log, in-memory **SSE** event bus. |
| **Database** | Users, bank profiles, bot tasks, ops launcher rows, audit events. |
| **Launcher** | Polls claim → runs work → polls stop requests → marks done. Authenticates with a shared **launcher key**, not operator JWT. |
| **Build server** | Optional. Packages per-profile bank bots and the ops launcher EXE; web checks health before offering downloads. |

There is **no in-repo worker process**. All heavy automation runs on the operator machine next to the launcher.

---

## Web experience

| Area | Who | Purpose |
|------|-----|---------|
| **Access** | Everyone | Email/password sign-in; JWT stored in a 12-hour httpOnly session cookie. |
| **Dashboard** | Anyone (richer when signed in) | API health, running/queued session counts, profile totals, quick links. |
| **Run Session** | Operator, admin | Start/stop sessions, SSE live board, launcher online indicators, optional EXE download when build server is up. |
| **Directory** | Admin | Create/edit bank profiles, view secrets (audited), portal MID, thin-runner path, trigger profile EXE builds. |
| **Team** | Admin | Onboard users (viewer / operator / admin), suspend or reactivate accounts. |

Protected routes redirect unauthenticated users to **Access** with a return URL. The dashboard itself stays reachable so you can confirm the API is up before logging in.

Profile keys drive automation defaults: **Paytm-style** keys map to `tp_127_paytm_main` / `PAYTM` settings; **Google** keys map to `tp_127_google_main` / `GMAIL` login. Unsupported keys cannot start a session until configured.

---

## API surface (conceptual)

| Area | Auth | Notes |
|------|------|-------|
| **Health** | Public | Liveness for dashboard and orchestration. |
| **Auth** | Public login; JWT elsewhere | Bootstrap admin on first boot when users table is empty. |
| **Banks** | JWT + role | Safe list for operators; admin CRUD; **login assist** (mobile + password, audited). |
| **Bot tasks** | JWT for create/list/stop; launcher key for claim/stop-requests/done | FIFO claim; returns decrypted profile payload to launcher only. |
| **Ops launchers** | JWT to list/record; launcher key on claim heartbeat | Tracks `needs_update`, `last_seen_at`, optional bot root path. |
| **Events** | JWT (operator/admin) | SSE: `task_update`, `launcher_heartbeat`, `ping` every 20s. |
| **Audit** | Admin | Recent security-sensitive actions. |

---

## Security

- **Operators** never send passwords to the browser for storage—only the API decrypts at claim time for the launcher.
- **Launchers** use `LAUNCHER_KEY` (+ `LAUNCHER_ID` header) on public task routes; mis-keyed requests are rejected.
- **Inactive users** cannot sign in or call protected APIs.
- Sensitive reads (`view_secrets`, `operator_login_assist`, user changes) write **audit events**.

| Role | Typical access |
|------|----------------|
| **Viewer** | Safe bank list (no secrets), read-only where exposed |
| **Operator** | Run Session, login assist, active task list |
| **Admin** | Directory, Team, audit log, launcher maintenance |

---

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 16+ (local or managed)
- **Ops launcher + bot tree** on each machine that executes automation
- **Build server** (optional) for Windows EXE generation

---

## Quick start

### 1. PostgreSQL

Install and start Postgres. Create a database user and database matching your connection string, for example:

`postgresql://ops:YOUR_PASSWORD@127.0.0.1:5432/ops`

### 2. Dependencies

From the **repository root**:

```bash
npm install
npm run install:all
```

### 3. Environment

Copy each package’s **example env** into a local env file.

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | API | Postgres connection |
| `JWT_SECRET` | API | Operator JWT signing |
| `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD` | API | First-boot admin (password ≥ 8 chars) |
| `MERCHANT_ENCRYPTION_KEY` | API | AES key for profile secrets (≥ 16 chars) |
| `LAUNCHER_KEY` | API + Web | Launcher EXE ↔ API shared secret |
| `OPS_API_URL` | Web | API base for server-side fetches |
| `BUILD_SERVER_URL` / `BUILD_API_KEY` | Web | Optional EXE build service |

Align `LAUNCHER_KEY` and `OPS_API_URL` across API and web. Match `INTERNAL` build credentials if your build server requires them.

### 4. Run

```bash
npm start
```

| Service | Default port |
|---------|----------------|
| API | `8899` (`/health`) |
| Web | `3001` |

Sign in at **Access**, then use **Dashboard** and **Run Session**. Admins manage profiles under **Directory** and people under **Team**.

---

## Operator workflow

1. **Admin** registers bank profiles (mobile, encrypted password/txn pass, API endpoint, optional portal MID and thin-runner path).
2. **Operator** opens **Run Session**, selects a profile, starts a session → task enters **pending**.
3. **Launcher** claims the oldest pending task → **running**, receives decrypted `values` for the script.
4. UI updates over **SSE**; operator can **stop** (queued tasks finish immediately; running tasks get **stop_requested**).
5. Launcher reads stop requests, tears down, calls **done**.

**Login assist** copies portal credentials for manual steps; every use is audited.

Optional: generate a **profile EXE** or **ops launcher EXE** when the build server is online (UI shows reachability).

---

## Production

- Set `NODE_ENV=production` on the API and **turn off** TypeORM `synchronize`.
- Apply **numbered SQL migrations** in order: users → bank profiles → audit → bot tasks → ops launchers.
- Rotate `JWT_SECRET`, `LAUNCHER_KEY`, encryption key, DB password, and bootstrap admin password.
- Terminate TLS at a reverse proxy; never commit real env files.
- Review policy before running production bank credentials on operator laptops.

---

## Repository shape

```
operation-platform/
├── API package      NestJS — auth, banks, bot-tasks, launchers, events, audit
├── Web package      Next.js — console UI + authenticated BFF routes
└── Migrations       Ordered PostgreSQL DDL for production
```

**External:** launcher executable, bot script tree, optional build server.
