# Paste into a new Cursor chat (handoff prompt)

Copy everything inside the block below into a **new Composer/Cursor chat** when prior context is gone.

---

```
You are helping ship ops-platform-standalone for SERVER deployment (not laptop-only).

## Goals
1. **Single-command dev/prod orchestration** for three processes until the host stays up:
   - Nest API (`apps/api`)
   - Next.js web (`apps/web`)
   - Python worker (`apps/worker` → `python -m worker`)
2. **Optional**: evolve toward a clearer monorepo tool (e.g. Nx) OR Docker Compose / systemd / PM2 — pick the smallest change that gives “one command, three services, restart on failure”.
3. **Parity with PyCharm / terminal Selenium**: the worker must run the SAME bot entrypoints as local dev (`integrations/b_auto_bot` or `B_AUTO_REPO_ROOT`), and scraping must behave like running `run_paytm_bot.py` (or thin runners) from PyCharm.

## Comparison workspace (operator setup)
Create a sibling folder layout ON THE SERVER OR LOCALLY for diffing behavior:

  ~/work/
    b_auto/                    ← full upstream clone (reference: how PyCharm runs it)
    ops-platform-standalone/   ← this repo

Use this to compare:
- `cwd`, `PYTHONPATH`, env vars, Chrome/ChromeDriver versions, headless flags
- whether ops worker resolves repo root to `integrations/b_auto_bot` vs real `b_auto`
- logs: worker prints `attached session id=…` then subprocess stdout → API → SSE on `/jobs/:id`

## Repo facts (do not re-litigate from memory)
- Worker loop: `apps/worker/worker/__main__.py` — **one process runs one subprocess at a time** unless multiple worker processes are started.
- Job claim: API `claimNext` moves `starting` → `running`; worker polls internal endpoints with `INTERNAL_API_TOKEN`.
- PayTM entrypoint owned by ops: `integrations/b_auto_bot/tp_127_executabes/run_paytm_bot.py` (do not replace from b_auto vendor blindly — runbook says keep ops-owned wrapper).
- Vendor/copy guide: `integrations/b_auto_bot/COPY_PASTE_RUNBOOK.md`

## If “no scraping like Selenium in PyCharm” — checklist (investigate in order)
1. **Worker bot root**: Confirm `B_AUTO_REPO_ROOT` (or default integrations path) points to the tree that actually contains working `tp_settings_2_0.py`, bank mains, and chromedriver assumptions — not an incomplete stub.
2. **Display / headless**: Server often has no DISPLAY; PyCharm on Mac had one. Check whether bot code assumes headed Chrome; may need `DISPLAY`, Xvfb, or explicit headless configuration consistent with b_auto.
3. **Chrome + ChromeDriver**: Match versions; PATH differs from PyCharm’s interpreter env.
4. **Session never attaches**: DB shows `running` but worker idle → stale row / duplicate workers — fix ops posture (single worker per pool or multi-worker design).
5. **Logs**: If subprocess starts, worker posts `[worker] pid=…` early — absence usually means crash before spawn or stale `running`.
6. **Side-by-side run**: From `b_auto` root run the SAME argv shape the worker logs as `cmd=…`; diff exit code and first Chrome actions.

## Deliverables to propose before coding
- Minimal orchestration: e.g. root `package.json` scripts + `concurrently`, OR `docker-compose.yml`, OR Nx targets — justify one approach.
- Production: restart policy, env files for API/web/worker, internal token wiring.

Read README files under `apps/api`, `apps/web`, `apps/worker`, and `integrations/b_auto_bot/README.md` before changing architecture.

Start by summarizing current startup commands and what’s missing for server parity with PyCharm Selenium.
```

---

## Quick reference (you keep this file)

| Piece | Location |
|-------|-----------|
| Worker | `apps/worker/worker/__main__.py` |
| API jobs | `apps/api/src/jobs/` |
| Web jobs UI | `apps/web/src/app/jobs/` |
| Vendored bot tree | `integrations/b_auto_bot/` |
| b_auto sync runbook | `integrations/b_auto_bot/COPY_PASTE_RUNBOOK.md` |

**Chat history:** Cursor chats do not automatically carry into a new window. Use this file + `@`-mentions of paths above so the model loads fresh context.
