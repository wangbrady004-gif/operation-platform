'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  Loader2,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { ProfileKeyBotIcon } from '@/components/profile-key-bot-icon';
import { toast } from '@/lib/toast';
import { useBuildServerStatus } from '@/lib/use-build-server';
import { BuildServerStatusBadge, buildServerBlocked } from '@/components/build-server-status';

// ── Types ──────────────────────────────────────────────────────────────────────

type BotTask = {
  id: string;
  profileKey: string;
  module: string;
  status: 'pending' | 'running' | 'stop_requested' | 'done';
  createdAt: string;
};

type OpsLauncher = {
  id: string;
  launcherId: string;
  botRoot: string | null;
  needsUpdate: boolean;
  createdByEmail: string;
  createdAt: string;
  lastSeenAt: string | null;
};

export type ProfileItem = {
  id: string;
  profileKey: string;
  mobileNumber: string;
  bankId?: string;
  lastUtrChatId?: string;
};

// ── SSE event shapes (must match API's SseEvent type) ─────────────────────────

type SseTaskUpdate = {
  type: 'task_update';
  id: string;
  profileKey: string;
  module: string;
  status: string;
  createdAt: string;
};

type SseLauncherHeartbeat = {
  type: 'launcher_heartbeat';
  launcherId: string;
  lastSeenAt: string;
};

type SseEvent = SseTaskUpdate | SseLauncherHeartbeat | { type: 'ping' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 15_000;
}

function inferBuildConfig(profileKey: string) {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE'))
    return { module: 'tp_127_google_main', settingsKey: 'GOOGLE', loginType: 'gmail_pass' as const };
  if (u.startsWith('TP_PAYTM') || u.startsWith('PAYTM'))
    return { module: 'tp_127_paytm_main', settingsKey: 'PAYTM', loginType: 'paytm_login' as const };
  return null;
}

// ── Profile card ───────────────────────────────────────────────────────────────

function ProfileCard({
  profile,
  task,
  onStart,
  onStop,
  canRun,
}: {
  profile: ProfileItem;
  task: BotTask | null;
  onStart: (profile: ProfileItem) => Promise<void>;
  onStop: (task: BotTask) => Promise<void>;
  canRun: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const isRunning = task !== null && task.status !== 'done';

  async function handleStart() {
    setBusy(true);
    try { await onStart(profile); } finally { setBusy(false); }
  }

  async function handleStop() {
    if (!task) return;
    setBusy(true);
    try { await onStop(task); } finally { setBusy(false); }
  }

  const statusLabel = () => {
    if (!task || task.status === 'done') return null;
    if (task.status === 'pending')        return { text: 'Waiting for launcher…', color: 'text-amber-400',   ping: 'bg-amber-400',   dot: 'bg-amber-500'   };
    if (task.status === 'stop_requested') return { text: 'Stopping…',            color: 'text-orange-400',  ping: 'bg-orange-400',  dot: 'bg-orange-500'  };
    return                                       { text: 'Running',               color: 'text-emerald-400', ping: 'bg-emerald-400', dot: 'bg-emerald-500' };
  };
  const st = statusLabel();

  return (
    <div className={`flex flex-col gap-4 rounded-xl border bg-zinc-900 p-4 transition ${
      isRunning
        ? 'border-emerald-700/60 shadow-[0_0_0_1px_rgba(16,185,129,0.10)]'
        : 'border-zinc-800 hover:border-zinc-700'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
          <ProfileKeyBotIcon profileKey={profile.profileKey} className="h-4 w-4 text-zinc-400" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm font-semibold text-zinc-100">{profile.profileKey}</p>
          {profile.mobileNumber && (
            <p className="truncate font-mono text-[11px] text-zinc-500">{profile.mobileNumber}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {st ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${st.ping} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${st.dot}`} />
            </span>
            <span className={`text-xs font-medium ${st.color}`}>{st.text}</span>
          </>
        ) : (
          <span className="text-xs text-zinc-600">Idle</span>
        )}
      </div>

      {isRunning ? (
        <button
          type="button"
          disabled={busy || task?.status === 'stop_requested'}
          onClick={handleStop}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
          {busy ? 'Stopping…' : 'Stop session'}
        </button>
      ) : (
        <button
          type="button"
          disabled={!canRun || busy}
          onClick={handleStart}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {busy ? 'Starting…' : 'Start session'}
        </button>
      )}
    </div>
  );
}

// ── Launcher section ───────────────────────────────────────────────────────────

/** Turns an email into a short stable launcher name: "ravi.kumar@co.com" → "ravi.kumar" */
function emailToLauncherId(email: string): string {
  return email.split('@')[0].toLowerCase();
}

function LauncherSection({
  isAdmin,
  currentEmail,
  launchers,
  onRefresh,
}: {
  isAdmin: boolean;
  currentEmail: string;
  launchers: OpsLauncher[];
  onRefresh: () => void;
}) {
  const [generating,  setGenerating]  = useState(false);
  const [rebuildId,   setRebuildId]   = useState<string | null>(null);
  const [deleteId,    setDeleteId]    = useState<string | null>(null);
  const [refreshing,  setRefreshing]  = useState(false);

  const buildServer = useBuildServerStatus();
  const buildBlocked = buildServerBlocked(buildServer);

  function handleRefresh() {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  const onlineCount   = launchers.filter((l) => isOnline(l.lastSeenAt)).length;
  const myLauncher    = launchers.find((l) => l.createdByEmail === currentEmail);
  const hasMyLauncher = Boolean(myLauncher);

  async function handleGenerate() {
    const launcherId = emailToLauncherId(currentEmail);
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-ops-launcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launcherId }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error('Could not generate launcher', { description: err.error });
        return;
      }
      const blob = await res.blob();
      triggerDownload(blob, `OpsLauncher_${launcherId}.exe`);
      toast.success('Launcher downloaded', {
        description: 'Run the EXE on your machine — it stays in the background.',
      });
      onRefresh();
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate(launcher: OpsLauncher) {
    setRebuildId(launcher.id);
    try {
      const patchRes = await fetch(`/api/generate-ops-launcher/${launcher.id}`, { method: 'PATCH' });
      if (!patchRes.ok) { toast.error('Could not initiate rebuild'); return; }

      const buildRes = await fetch('/api/generate-ops-launcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ launcherId: launcher.launcherId }),
      });
      if (!buildRes.ok) {
        const err = await buildRes.json() as { error?: string };
        toast.error('Rebuild failed', { description: err.error });
        return;
      }
      const blob = await buildRes.blob();
      triggerDownload(blob, `OpsLauncher_${launcher.launcherId}.exe`);
      toast.success(`${launcher.launcherId} rebuilt`, {
        description: 'Replace the old EXE on the ops machine with this new file.',
      });
      onRefresh();
    } finally {
      setRebuildId(null);
    }
  }

  async function handleDelete(launcher: OpsLauncher) {
    setDeleteId(launcher.id);
    try {
      const res = await fetch(`/api/generate-ops-launcher/${launcher.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success(`${launcher.launcherId} removed`); onRefresh(); }
    } finally {
      setDeleteId(null);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-5 py-3.5">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200">Launchers</p>
          <span className="text-xs text-zinc-600">·</span>
          <span className="text-xs text-zinc-500">One EXE per ops person</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {launchers.length > 0 && (
            <div className="flex items-center gap-1.5">
              {onlineCount > 0
                ? <><Wifi size={12} className="text-emerald-500" /><span className="text-xs font-medium text-emerald-400">{onlineCount} online</span></>
                : <><WifiOff size={12} className="text-zinc-600" /><span className="text-xs text-zinc-600">All offline</span></>
              }
            </div>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Refresh launcher list"
            className="rounded-md p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Launcher list */}
      {launchers.length > 0 && (
        <ul className="divide-y divide-zinc-800/60">
          {launchers.map((l) => {
            const online  = isOnline(l.lastSeenAt);
            const busyRow = rebuildId === l.id || deleteId === l.id;
            return (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                <span className="relative flex h-2 w-2 shrink-0">
                  {online && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-medium text-zinc-200 truncate">{l.launcherId}</p>
                  <p className="text-[11px] text-zinc-600 truncate">{l.createdByEmail}</p>
                </div>

                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  online
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {online ? 'Online' : 'Offline'}
                </span>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={busyRow || buildBlocked}
                      onClick={() => void handleRegenerate(l)}
                      title={buildBlocked ? 'Build server offline' : 'Re-generate and download a fresh EXE'}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-zinc-500 hover:text-violet-400 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {rebuildId === l.id
                        ? <><Loader2 size={11} className="animate-spin" /> Building…</>
                        : <><RefreshCw size={11} /> Rebuild</>
                      }
                    </button>
                    <button
                      type="button"
                      disabled={busyRow}
                      onClick={() => void handleDelete(l)}
                      title="Remove record"
                      className="rounded-md p-1 text-zinc-600 hover:text-red-400 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {deleteId === l.id
                        ? <Loader2 size={13} className="animate-spin" />
                        : <Trash2 size={13} />
                      }
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {launchers.length === 0 && !hasMyLauncher && (
        <p className="px-5 py-4 text-sm text-zinc-500">
          No launcher yet. Generate yours below.
        </p>
      )}

      {!hasMyLauncher && (
        <div className="border-t border-zinc-800 px-5 py-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-zinc-200">Get your launcher</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              One EXE per account. It runs silently in the background and picks up sessions automatically.
            </p>
          </div>
          <BuildServerStatusBadge status={buildServer} />
          <button
            type="button"
            disabled={generating || buildBlocked}
            onClick={() => void handleGenerate()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {generating
              ? <><Loader2 size={14} className="animate-spin" /> Building…</>
              : <><Download size={14} /> Download EXE</>
            }
          </button>
          <p className="text-[11px] text-zinc-600">
            You can only generate one launcher. To re-issue, ask an admin to{' '}
            <span className="text-zinc-500">Rebuild</span> or delete your record.
          </p>
        </div>
      )}

      {hasMyLauncher && !isAdmin && (
        <div className="border-t border-zinc-800 px-5 py-3">
          <p className="text-xs text-zinc-600">
            Your launcher is registered. Contact an admin to re-issue it.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sessions board ─────────────────────────────────────────────────────────────

export function SessionsBoard({
  profiles: allProfiles,
  canRun,
  isAdmin,
  currentEmail,
}: {
  profiles: ProfileItem[];
  canRun: boolean;
  isAdmin: boolean;
  currentEmail: string;
}) {
  const [tasks,     setTasks]     = useState<BotTask[]>([]);
  const [launchers, setLaunchers] = useState<OpsLauncher[]>([]);

  // Trigger re-render every 5 s so isOnline() recomputes against the current
  // timestamp — catches launchers that went offline (stopped heartbeating)
  // without any HTTP request.
  const [, setTick] = useState(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const profiles = allProfiles.filter((p) => inferBuildConfig(p.profileKey) !== null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/run-tasks');
      if (res.ok) setTasks(await res.json() as BotTask[]);
    } catch { /* ignore */ }
  }, []);

  const fetchLaunchers = useCallback(async () => {
    try {
      const res = await fetch('/api/generate-ops-launcher');
      if (res.ok) setLaunchers(await res.json() as OpsLauncher[]);
    } catch { /* ignore */ }
  }, []);

  // ── SSE connection ────────────────────────────────────────────────────────────
  //
  // One persistent connection replaces all task polling.
  // • task_update      → upsert or remove from tasks state instantly
  // • launcher_heartbeat → refresh lastSeenAt in launchers state (no HTTP)
  // • ping             → ignored (keepalive from server)
  //
  // On error the browser's native EventSource auto-reconnects with
  // exponential back-off. We add our own delay to avoid hammering the
  // server if auth has expired.

  useEffect(() => {
    // Load initial state before the SSE stream catches up
    void fetchTasks();
    void fetchLaunchers();

    let es: EventSource;

    function connect() {
      es = new EventSource('/api/events');

      es.onmessage = (e: MessageEvent<string>) => {
        let event: SseEvent;
        try { event = JSON.parse(e.data) as SseEvent; } catch { return; }

        if (event.type === 'task_update') {
          const upd = event as SseTaskUpdate;
          setTasks((prev) => {
            if (upd.status === 'done') {
              return prev.filter((t) => t.id !== upd.id);
            }
            const task: BotTask = {
              id:         upd.id,
              profileKey: upd.profileKey,
              module:     upd.module,
              status:     upd.status as BotTask['status'],
              createdAt:  upd.createdAt,
            };
            const idx = prev.findIndex((t) => t.id === upd.id);
            if (idx === -1) return [...prev, task];
            return prev.map((t) => t.id === upd.id ? task : t);
          });
        } else if (event.type === 'launcher_heartbeat') {
          const hb = event as SseLauncherHeartbeat;
          setLaunchers((prev) =>
            prev.map((l) =>
              l.launcherId === hb.launcherId
                ? { ...l, lastSeenAt: hb.lastSeenAt }
                : l,
            ),
          );
        }
        // 'ping' — ignore, it's just a keepalive
      };

      es.onerror = () => {
        // EventSource readyState: 0=connecting, 1=open, 2=closed
        if (es.readyState === EventSource.CLOSED) {
          // Stream fully dropped — reconnect after 3 s and re-sync state
          // to catch any task/launcher events that happened during the gap.
          reconnectTimer.current = setTimeout(() => {
            void fetchTasks();
            void fetchLaunchers();
            connect();
          }, 3_000);
        }
        // CONNECTING state means the browser is already retrying natively;
        // when it succeeds it will emit the next event and we stay in sync.
      };
    }

    connect();

    // Tick every 5 s to recompute isOnline() without HTTP
    const tickId = setInterval(() => setTick((t) => t + 1), 5_000);

    return () => {
      es.close();
      clearInterval(tickId);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [fetchTasks, fetchLaunchers]);

  // ─────────────────────────────────────────────────────────────────────────────

  const activeCount = tasks.filter((t) => t.status !== 'done').length;

  function taskForProfile(profileKey: string): BotTask | null {
    return tasks.find(
      (t) => t.profileKey.toUpperCase() === profileKey.toUpperCase() && t.status !== 'done',
    ) ?? null;
  }

  async function handleStart(profile: ProfileItem) {
    const cfg = inferBuildConfig(profile.profileKey);
    if (!cfg) { toast.error('Unsupported profile type'); return; }

    const anyOnline = launchers.some((l) => isOnline(l.lastSeenAt));
    if (!anyOnline) {
      toast.warning('No launcher running', {
        description: 'Run OpsLauncher.exe on your machine — the task will queue and start automatically once it connects.',
      });
    }

    const res = await fetch('/api/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankProfileId:  profile.id,
        profileKey:  profile.profileKey,
        module:      cfg.module,
        settingsKey: cfg.settingsKey,
        loginType:   cfg.loginType,
      }),
    });

    if (!res.ok) {
      const err = await res.json() as { message?: string };
      toast.error('Could not start session', { description: err.message });
      return;
    }

    // SSE will push the task_update back; optimistically add it immediately
    // so the card switches to "Waiting…" without waiting for the SSE round-trip.
    const task = await res.json() as BotTask;
    setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task]);

    if (anyOnline) {
      toast.success(`${profile.profileKey} queued`, {
        description: 'Launcher will pick it up in a moment.',
      });
    }
  }

  async function handleStop(task: BotTask) {
    const res = await fetch(`/api/run-tasks/${task.id}`, { method: 'DELETE' });
    if (!res.ok) { toast.error('Could not stop session'); return; }

    const updated = await res.json() as BotTask;
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    toast.success(`${task.profileKey} stopping…`);
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          No profiles found.{' '}
          <a href="/banks" className="font-medium text-emerald-400 hover:underline">
            Add one in Vendor Registry.
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Launcher panel */}
      <LauncherSection
        isAdmin={isAdmin}
        currentEmail={currentEmail}
        launchers={launchers}
        onRefresh={() => void fetchLaunchers()}
      />

      {/* Launcher-offline nudge */}
      {launchers.length > 0 && !launchers.some((l) => isOnline(l.lastSeenAt)) && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-amber-300">Launcher offline</p>
            <p className="mt-0.5 text-xs text-amber-500">
              Run <span className="font-mono">OpsLauncher.exe</span> on your machine — sessions will queue and start automatically once it connects.
            </p>
          </div>
        </div>
      )}

      {/* Active sessions banner */}
      {activeCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-800/50 bg-emerald-950/30 px-4 py-3">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="text-sm font-medium text-emerald-300">
            {activeCount} session{activeCount > 1 ? 's' : ''} active
          </p>
        </div>
      )}

      {/* Profile cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((p) => (
          <ProfileCard
            key={p.id}
            profile={p}
            task={taskForProfile(p.profileKey)}
            onStart={handleStart}
            onStop={handleStop}
            canRun={canRun}
          />
        ))}
      </div>
    </div>
  );
}
