'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Loader2, Play, RefreshCw, Square, Trash2 } from 'lucide-react';
import { ProfileKeyBotIcon } from '@/components/profile-key-bot-icon';
import { toast } from '@/lib/toast';

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
};

function inferBuildConfig(profileKey: string) {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) return { module: 'tp_127_google_main', settingsKey: 'GOOGLE', loginType: 'gmail_pass' as const };
  return null;
}

export type ProfileItem = {
  id: string;
  profileKey: string;
  mobileNumber: string;
  bankId?: string;
  lastUtrChatId?: string;
};

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
    if (task.status === 'pending') return { text: 'Waiting for launcher…', color: 'text-amber-400' };
    if (task.status === 'stop_requested') return { text: 'Stopping…', color: 'text-orange-400' };
    return { text: 'Running', color: 'text-emerald-400' };
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
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${task?.status === 'running' ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${task?.status === 'running' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
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

// ── Launcher download section ──────────────────────────────────────────────────

function LauncherDownload({ isAdmin }: { isAdmin: boolean }) {
  const [launchers, setLaunchers] = useState<OpsLauncher[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const fetchLaunchers = useCallback(async () => {
    const res = await fetch('/api/generate-ops-launcher');
    if (res.ok) setLaunchers(await res.json() as OpsLauncher[]);
  }, []);

  useEffect(() => { void fetchLaunchers(); }, [fetchLaunchers]);

  async function handleGenerate() {
    const launcherId = name.trim();
    if (!launcherId) { toast.error('Enter a name for this launcher'); return; }
    setBusy(true);
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OpsLauncher_${launcherId}.exe`;
      a.click();
      URL.revokeObjectURL(url);
      setName('');
      toast.success('Launcher downloaded', { description: 'Run it once — stays in background forever.' });
      void fetchLaunchers();
    } finally {
      setBusy(false);
    }
  }

  async function handleMarkUpdate(launcher: OpsLauncher) {
    setActionBusy(launcher.id);
    try {
      const res = await fetch(`/api/generate-ops-launcher/${launcher.id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success(`${launcher.launcherId} marked for update`);
        void fetchLaunchers();
      }
    } finally { setActionBusy(null); }
  }

  async function handleDelete(launcher: OpsLauncher) {
    setActionBusy(launcher.id);
    try {
      const res = await fetch(`/api/generate-ops-launcher/${launcher.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`${launcher.launcherId} removed`);
        void fetchLaunchers();
      }
    } finally { setActionBusy(null); }
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Download size={15} className="text-violet-400 shrink-0" />
        <p className="text-sm font-medium text-zinc-200">Ops Launchers</p>
        <span className="ml-auto text-xs text-zinc-500">One-time setup per ops person</span>
      </div>

      {/* Existing launchers */}
      {launchers.length > 0 && (
        <ul className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
          {launchers.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-4 py-2.5 bg-zinc-950/40">
              <span className={`h-2 w-2 rounded-full shrink-0 ${l.needsUpdate ? 'bg-amber-400' : 'bg-emerald-500'}`} />
              <span className="font-mono text-sm text-zinc-200 flex-1">{l.launcherId}</span>
              <span className="text-xs text-zinc-600">{l.needsUpdate ? 'Update available' : 'Active'}</span>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  {!l.needsUpdate && (
                    <button
                      type="button"
                      disabled={actionBusy === l.id}
                      onClick={() => void handleMarkUpdate(l)}
                      title="Mark for update (allows re-download)"
                      className="p-1.5 rounded text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition disabled:opacity-40"
                    >
                      {actionBusy === l.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actionBusy === l.id}
                    onClick={() => void handleDelete(l)}
                    title="Remove record"
                    className="p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition disabled:opacity-40"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Generate new */}
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ops person name (e.g. Ravi)"
          onKeyDown={(e) => e.key === 'Enter' && void handleGenerate()}
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleGenerate()}
          className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {busy ? 'Building…' : 'Generate'}
        </button>
      </div>
    </div>
  );
}

// ── Sessions board ─────────────────────────────────────────────────────────────

export function SessionsBoard({
  profiles: allProfiles,
  canRun,
  isAdmin,
}: {
  profiles: ProfileItem[];
  canRun: boolean;
  isAdmin: boolean;
}) {
  const [tasks, setTasks] = useState<BotTask[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const profiles = allProfiles.filter((p) => p.profileKey.toUpperCase().includes('GOOGLE'));

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/run-tasks');
      if (res.ok) setTasks(await res.json() as BotTask[]);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    void fetchTasks();
    pollRef.current = setInterval(() => void fetchTasks(), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchTasks]);

  const activeCount = tasks.filter((t) => t.status !== 'done').length;

  function taskForProfile(profileKey: string): BotTask | null {
    return tasks.find(
      (t) => t.profileKey.toUpperCase() === profileKey.toUpperCase() && t.status !== 'done',
    ) ?? null;
  }

  async function handleStart(profile: ProfileItem) {
    const cfg = inferBuildConfig(profile.profileKey);
    if (!cfg) { toast.error('Unsupported profile type'); return; }

    const res = await fetch('/api/run-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId:  profile.id,
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

    const task = await res.json() as BotTask;
    setTasks((prev) => [...prev.filter((t) => t.id !== task.id), task]);
    toast.success(`${profile.profileKey} queued`, {
      description: 'Waiting for the ops launcher to pick it up.',
    });
  }

  async function handleStop(task: BotTask) {
    const res = await fetch(`/api/run-tasks/${task.id}`, { method: 'DELETE' });
    if (!res.ok) {
      toast.error('Could not stop session');
      return;
    }
    const updated = await res.json() as BotTask;
    setTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t));
    toast.success(`${task.profileKey} stopping…`);
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
        <p className="text-sm text-zinc-500">
          No Google Pay profiles found.{' '}
          <a href="/merchants" className="font-medium text-emerald-400 hover:underline">
            Add one in Vendor Registry.
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Launcher download */}
      <LauncherDownload isAdmin={isAdmin} />

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
