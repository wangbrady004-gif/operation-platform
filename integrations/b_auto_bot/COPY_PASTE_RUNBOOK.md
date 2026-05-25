# Copy-paste runbook — vendor PayTM files from `b_auto`

Goal: pull **only** the PayTM subgraph from your laptop **`b_auto`** clone into **`integrations/b_auto_bot`**, without touching **`run_paytm_bot.py`** (ops-owned).

Pick **one** path below.

---

## A) Paste into Terminal (fastest — vend straight into this repo)

```bash
cd /path/to/ops-platform-standalone/integrations/b_auto_bot
chmod +x ./vendor_paytm_from_b_auto.sh   # once

export SRC_B_AUTO="/absolute/path/to/your/b_auto_clone"
./vendor_paytm_from_b_auto.sh --keep-stub-settings
```

Use **`--keep-stub-settings`** so you **keep** the repo’s **`tp_settings_2_0.py`** stub and rely on Postgres + **`--config-file`** overlays (recommended for git). Omit that flag **only** if you intend to overwrite with upstream settings locally and scrub before commit (**README** Section F).

Dry run:

```bash
export SRC_B_AUTO="/absolute/path/to/b_auto"
./vendor_paytm_from_b_auto.sh --keep-stub-settings --dry-run
```

Worker env (explicit):

```bash
export B_AUTO_REPO_ROOT="/absolute/path/to/ops-platform-standalone/integrations/b_auto_bot"
```

Bots venv (from worker machine; **`REPO`** = monorepo root):

```bash
export REPO="/path/to/ops-platform-standalone"
cd "$REPO/apps/worker"
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m pip install -r "$REPO/integrations/b_auto_bot/requirements-worker-bots.txt"
```

---

## B) Staging folder → drag into monorepo

Creates a standalone folder with the same layout so you can **Finder / drag** into **`integrations/b_auto_bot`** (resolve overwrites prompts yourself).

```bash
cd /path/to/ops-platform-standalone/integrations/b_auto_bot
chmod +x ./vendor_paytm_from_b_auto.sh   # once

export SRC_B_AUTO="/absolute/path/to/b_auto"
./vendor_paytm_from_b_auto.sh --staging ~/Desktop/b_auto_paytm_vendor --keep-stub-settings
```

Then:

1. Open **`~/Desktop/b_auto_paytm_vendor`**
2. Select **`tp_settings_2_0.py`** (only if you used upstream copy — you skipped with **`--keep-stub-settings`**), **`trustpay_curl_2_0.py`**, **`tp_telegram_bot_2_0.py`**, folders **`tp_127_bank_mains`**, **`tp_127_executabes`**
3. Drag into **`ops-platform-standalone/integrations/b_auto_bot/`** and confirm merges
4. Ensure **`tp_127_executabes/run_paytm_bot.py`** from git is still present (not from **`b_auto`**)

---

## C) Paste into Cursor / another agent (prompt)

Use this as a **single user message** (replace the two paths):

```text
You are on my machine with full terminal access.

1. Create the directory STAGING="/absolute/path/to/Desktop/b_auto_paytm_vendor" with subdirs tp_127_bank_mains and tp_127_executabes.

2. My b_auto clone is at SRC_B_AUTO="/absolute/path/to/b_auto". From SRC_B_AUTO, copy into STAGING:
   - trustpay_curl_2_0.py
   - tp_telegram_bot_2_0.py
   - tp_127_bank_mains/tp_127_paytm_main.py
   - tp_127_bank_mains/tp_127_paytm_trj_main.py
   - tp_127_bank_mains/tp_127_paytm_new_main.py
   - Every file matching tp_127_executabes/TP_PAYTM*.py (maxdepth 1 only; do not copy all executables)

3. Do NOT copy tp_127_executabes/run_paytm_bot.py from b_auto (it does not exist upstream; ops repo owns it).

4. Do NOT copy tp_settings_2_0.py unless I say so — I use the stub in ops-platform-standalone/integrations/b_auto_bot.

5. Print a short summary: file counts and any missing paths.

6. Tell me to drag STAGING into ops-platform-standalone/integrations/b_auto_bot and to set B_AUTO_REPO_ROOT to that integrations path.
```

If you want the agent to vend **directly** into the repo, change step 1 to set **`STAGING="/absolute/path/to/ops-platform-standalone/integrations/b_auto_bot"`** and skip drag instructions.

---

## After vendoring

- Scrub secrets in **`trustpay_curl_2_0.py`** / **`tp_telegram_bot_2_0.py`** before **`git push`** (see **README** Section F).
- Install **`requirements-worker-bots.txt`** in the worker venv.
- Chrome/Chromium must match Selenium on the worker host.

---

## D) Run the whole platform (Postgres → API → Web → Worker)

Use one **`INTERNAL_API_TOKEN`** everywhere (API `.env`, worker **`worker/.env`**). **`OPS_API_URL`** in web (**`.env.local`**) + worker must match **`PORT`** in API **`.env`** (example below uses **`8899`**; default in **`.env.example`** is **`3000`** — any port is fine as long as all three agree).

### 1) Database

**Option A — Docker Compose** (official sample: user `ops`, port **5432**):

```bash
export REPO="/Users/sergio.marquina/Tokyo/ops-platform-standalone"   # your clone
docker compose -f "$REPO/docker-compose.yml" up -d
# API DATABASE_URL=postgresql://ops:ops@127.0.0.1:5432/ops
```

**Option B — Your own Postgres** (like port **5433**): set **`DATABASE_URL`** in **`apps/api/.env`** accordingly. Apply SQL under **`db-production-migrations/`** if you are not relying on TypeORM **`synchronize`** only.

### 2) API

```bash
export REPO="/Users/sergio.marquina/Tokyo/ops-platform-standalone"
cd "$REPO/apps/api"
cp .env.example .env   # skip if .env exists; ensure PORT / DATABASE_URL / tokens
npm install
npm run start:dev
```

Ensure **`INTERNAL_API_TOKEN`**, **`MERCHANT_ENCRYPTION_KEY`** (≥16 chars), **`INIT_ADMIN_PASSWORD`**, **`JWT_SECRET`**.

### 3) Web

```bash
cd "$REPO/apps/web"
cp .env.example .env.local   # skip if present
```

Set **`OPS_API_URL=http://127.0.0.1:<API_PORT>`** (same **`PORT`** as API).

```bash
npm install
npm run dev    # http://127.0.0.1:3001
```

Sign in at **`/login`** (bootstrap admin from **`INIT_ADMIN_*`**).

### 4) Worker venv + PayTM wheels

```bash
cd "$REPO/apps/worker"
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m pip install -r "$REPO/integrations/b_auto_bot/requirements-worker-bots.txt"
```

### 5) Worker **`worker/.env`**

- **`OPS_API_URL`** = same base as web (**e.g.** `http://127.0.0.1:8899`).
- **`INTERNAL_API_TOKEN`** = same as **`apps/api/.env`**.
- **`B_AUTO_REPO_ROOT`** = **`$REPO/integrations/b_auto_bot`** after vendoring (Section A).

Then:

```bash
cd "$REPO/apps/worker"
source .venv/bin/activate
python3 -m worker
```

### 6) Platform flow (operators)

1. **Admin:** **`/merchants`** → create merchant (paste a profile dict line or use the form; set **`executable_relative_path`** to the correct thin script where needed). See **`scripts/merchant-profile-create.example.json`** for field shape.
2. **Operator:** **`/merchant-run`** → select merchant card → **Open portal & load credentials** → after login, fill transaction/order id and customer name → **Start automation**. Deferred anchors paste on **`/jobs/[id]`** while the bot polls.
3. Worker runs **`tp_127_executabes/run_paytm_bot.py`** with **`--config-file`**, **`INTERNAL_API_TOKEN`**, **`OPS_JOB_ID`** (for deferred poll only).

**Profile key** must match the key your thin script uses (e.g. `TP_PAYTM_NAME_SHOP_1_RBL.py` uses **`PAYTM_SHOP_1_RBL`** in code).

Chrome must be installed on the laptop running the worker.

Smoke test (**`/jobs`**): enqueue script **`tp_127_executabes/noop.py`** (prints and exits — no Selenium).
