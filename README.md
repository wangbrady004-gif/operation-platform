# Ops Platform

A control plane for PayTM merchant operations: operators queue automation **sessions** from the browser, and **launcher programs** on their own machines pull work, run scripts locally, and report back. The stack is intentionally split so secrets stay encrypted in the database, the API stays the single source of truth, and heavy automation never runs inside the web server.

---

## Architecture

```mermaid
flowchart TB
  subgraph clients["Operator machines"]
    EXE["Ops launcher (desktop)"]
    SCRIPTS["Local bot scripts"]
    EXE --> SCRIPTS
  end

  subgraph platform["Ops platform"]
    WEB["Web UI · Next.js"]
    API["API · NestJS"]
    PG[("PostgreSQL")]
    WEB <-->|JWT + server proxy| API
    API <--> PG
  end

  subgraph optional["Optional services"]
    BUILD["Build server · EXE generation"]
  end

  BROWSER["Browser"] --> WEB
  EXE -->|launcher key| API
  WEB -.->|generate launcher / merchant EXE| BUILD
  API -.-> BUILD

  SSE["Real-time events (SSE)"]
  API --> SSE
  SSE --> WEB
```

### How a session runs

```mermaid
sequenceDiagram
  participant Op as Operator (browser)
  participant API as API
  participant DB as Database
  participant L as Launcher (local)

  Op->>API: Create bot task (merchant + profile + module)
  API->>DB: pending task
  API-->>Op: SSE task_update

  loop Poll
    L->>API: Claim next task (launcher key)
    API->>DB: running + attach launcher id
    API-->>L: Task + decrypted merchant fields
    API-->>Op: SSE task_update
  end

  L->>L: Run automation locally

  alt Stop requested
    Op->>API: Stop task
    API->>DB: stop_requested
    L->>API: Fetch stop requests
    L->>L: Tear down run
  end

  L->>API: Mark done
  API->>DB: done
  API-->>Op: SSE task_update
```

---

## Layers

| Layer | Responsibility |
|--------|----------------|
| **Web** | Login, dashboard, merchant directory, team admin, live session board with SSE |
| **API** | Auth, RBAC, encrypted merchant vault, task queue, launcher registry, audit log, event bus |
| **Database** | Users, merchants, bot tasks, launcher records, audit events |
| **Launcher** | Long-running desktop agent: claim work, honor stop signals, heartbeat, finish tasks |
| **Build server** | Optional remote service that compiles launcher and per-merchant executables |

There is **no in-repo Python worker**. Automation executes on the machine where the launcher and bot tree are installed.

---

## Security model

- **Operators** sign in with email and password; the web app holds a short-lived **JWT** in an httpOnly cookie.
- **Merchant passwords and transaction secrets** are encrypted at rest (AES-GCM); only authorized roles can decrypt, and sensitive reads are **audit-logged**.
- **Launchers** never use JWT. They authenticate with a shared **launcher key** baked into the generated executable and configured on the API.
- **Roles** gate every route; inactive users cannot sign in.

| Role | Capabilities |
|------|----------------|
| **Viewer** | Read-only visibility where exposed (e.g. merchant list without secrets) |
| **Operator** | Queue and stop sessions, login assist for manual PayTM steps, view live board |
| **Admin** | Full merchant CRUD, team management, audit log, launcher maintenance flags |

---

## Real-time UI

The API exposes a **Server-Sent Events** stream for operators and admins. The web app subscribes through its own API route so the browser never holds a raw API token in JavaScript for SSE.

Events include:

- **task_update** — create, claim, stop, complete
- **launcher_heartbeat** — launcher poll activity (fresh “last seen” in the UI)
- **ping** — keepalive every 20 seconds

---

## Prerequisites

- **Node.js** 20+ recommended
- **PostgreSQL** 16+ (local install or any managed instance)
- **Ops launcher + bot tree** on each machine that runs automation (outside this repo)

---

## Quick start

### 1. Database

Install and start PostgreSQL locally. Create a database and role that match your connection string (example):

`postgresql://ops:YOUR_PASSWORD@127.0.0.1:5432/ops`

### 2. Install dependencies

From the **repository root**:

```bash
npm install
npm run install:all
```

This installs the API and web packages. Root dependencies only orchestrate `npm start`.

### 3. Configure environments

Copy each app’s **example env** into a local env file and align:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection (API) |
| `JWT_SECRET` | Sign operator tokens (API) |
| `INIT_ADMIN_EMAIL` / `INIT_ADMIN_PASSWORD` | Bootstrap admin on first boot (API) |
| `MERCHANT_ENCRYPTION_KEY` | Encrypt merchant secrets, ≥16 chars (API) |
| `LAUNCHER_KEY` | Shared secret for desktop launchers (API + web) |
| `OPS_API_URL` | API base URL for server-side web fetches (web) |
| `BUILD_SERVER_URL` / `BUILD_API_KEY` | Optional EXE build service (web) |

On first API start with an empty users table and `INIT_ADMIN_PASSWORD` set, an **admin** account is created automatically.

### 4. Run

From the repository root:

```bash
npm start
```

- **API** — default port `8899` (health check at `/health`)
- **Web** — default port `3001`

Open the web app, sign in at **Access**, then use **Dashboard** and **Run Session**.

---

## Operator workflow

1. **Admin** adds PayTM merchant profiles (encrypted credentials, runner metadata).
2. **Operator** opens **Run Session**, picks merchant / profile / module, starts a session → API enqueues a **pending** task.
3. **Launcher** on the same LAN/machine polls **claim**; receives decrypted fields needed for the script.
4. Operator watches the board update over SSE; can **stop** running or queued work.
5. Launcher polls **stop requests**, shuts down, then **marks done**.

Login assist (mobile + password for manual portal login) is available to operators and admins and is always audited.

---

## Launcher registry

Admins and operators can record which launcher IDs exist, when they were generated, and whether a rebuild is required. Launchers send heartbeats during claim polls so the UI can show staleness.

Launcher generation (optional) calls an external **build server** that embeds `LAUNCHER_KEY` and API URL into a Windows executable, then registers the ID with the API.

---

## Production

- Set `NODE_ENV=production` on the API and **disable** TypeORM `synchronize`; apply the **numbered SQL migrations** in the production migrations folder in order (users → merchants → audit → bot tasks → ops launchers).
- Rotate `JWT_SECRET`, `LAUNCHER_KEY`, `MERCHANT_ENCRYPTION_KEY`, database credentials, and bootstrap admin password.
- Terminate TLS at your reverse proxy; keep launcher keys out of logs and screenshots.
- Do not run merchant automation with production bank credentials from unmanaged devices without policy review.

---

## Monorepo layout (conceptual)

```
ops-platform/
├── api/          NestJS — auth, tasks, merchants, launchers, events, audit
├── web/          Next.js — operator UI + BFF-style API routes
└── migrations/   PostgreSQL DDL for production rollouts
```

External: **launcher executable**, **bot script tree**, and optionally a **build server** for packaging EXEs.
