import Link from 'next/link';
import { Bot, Play, AlertTriangle, Store, Zap } from 'lucide-react';
import { fetchOpsHealth, getOpsApiBaseUrl } from '@/lib/ops-api';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { PageShell } from '@/components/page-shell';
import { ProfileKeyBotIcon } from '@/components/profile-key-bot-icon';

export const dynamic = 'force-dynamic';

type BotTask = {
  id: string;
  profileKey: string;
  module: string;
  status: 'pending' | 'running' | 'stop_requested' | 'done';
  claimedBy: string | null;
  createdByEmail: string;
  createdAt: string;
};

type BankRow = {
  id: string;
  profileKey: string;
  mobileNumber: string;
};

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: 'emerald' | 'sky' | 'amber' | 'zinc';
  icon: React.ReactNode;
}) {
  const dot: Record<string, string> = {
    emerald: 'text-emerald-400 bg-emerald-950/50',
    sky:     'text-sky-400 bg-sky-950/50',
    amber:   'text-amber-400 bg-amber-950/50',
    zinc:    'text-zinc-400 bg-zinc-800',
  };
  const val: Record<string, string> = {
    emerald: 'text-emerald-300',
    sky:     'text-sky-300',
    amber:   'text-amber-300',
    zinc:    'text-zinc-200',
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 flex items-center gap-4">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${dot[accent]}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <p className={`mt-0.5 text-2xl font-bold tabular-nums ${val[accent]}`}>{value}</p>
        {sub && <p className="mt-0.5 text-xs text-zinc-600">{sub}</p>}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pending:       'Waiting',
  running:       'Running',
  stop_requested: 'Stopping',
};

const STATUS_COLOR: Record<string, string> = {
  pending:        'bg-amber-500/20 text-amber-300',
  running:        'bg-emerald-500/20 text-emerald-300',
  stop_requested: 'bg-orange-500/20 text-orange-300',
};

export default async function Home() {
  const health = await fetchOpsHealth();
  const apiBase = getOpsApiBaseUrl();
  const servicesOk = health.ok;

  const auth = await getBearerHeaders();
  let isAdmin = false;
  if (auth) {
    const res = await fetch(`${apiBase}/auth/me`, { headers: auth, cache: 'no-store' });
    if (res.ok) {
      const u = (await res.json()) as { role?: string };
      isAdmin = u.role === 'admin';
    }
  }

  let activeTasks: BotTask[] = [];
  if (auth) {
    const r = await fetch(`${apiBase}/bot-tasks`, { headers: auth, cache: 'no-store' });
    if (r.ok) activeTasks = (await r.json()) as BotTask[];
  }

  let banks: BankRow[] = [];
  if (auth) {
    const endpoint = isAdmin ? `${apiBase}/banks/admin` : `${apiBase}/banks`;
    const r = await fetch(endpoint, { headers: auth, cache: 'no-store' });
    if (r.ok) banks = (await r.json()) as BankRow[];
  }

  const runningCount = activeTasks.filter((t) => t.status === 'running').length;
  const pendingCount = activeTasks.filter((t) => t.status === 'pending').length;

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-50">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-400">Automation control plane.</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className={`h-2 w-2 rounded-full shrink-0 ${servicesOk ? 'bg-emerald-500' : 'bg-red-500'}`} />
            <span className={`text-xs font-medium ${servicesOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {servicesOk ? 'API online' : 'API offline'}
            </span>
          </div>
        </div>

        {!auth && (
          <div className="rounded-xl border border-amber-900 bg-amber-950/30 px-4 py-3 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-200">Not authenticated. <Link href="/access" className="font-medium underline">Sign in</Link> to see live data.</p>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            label="Running"
            value={runningCount}
            sub={runningCount === 0 ? 'All idle' : `${runningCount} bots active`}
            accent="emerald"
            icon={<Bot className="h-5 w-5" />}
          />
          <StatCard
            label="Queued"
            value={pendingCount}
            sub="Waiting for launcher"
            accent={pendingCount > 0 ? 'amber' : 'zinc'}
            icon={<Zap className="h-5 w-5" />}
          />
          <StatCard
            label="Profiles"
            value={banks.length}
            sub="Registered"
            accent="sky"
            icon={<Store className="h-5 w-5" />}
          />
        </div>

        {/* Active tasks alert */}
        {activeTasks.length > 0 && (
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-sm font-medium text-emerald-300">
              {activeTasks.length} session{activeTasks.length > 1 ? 's' : ''} active
            </p>
            <Link
              href="/bank-run"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              <Play className="h-3 w-3" />
              View
            </Link>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Active bot tasks */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-zinc-200">Active Sessions</h2>
                <p className="mt-0.5 text-xs text-zinc-500">Currently running or queued bot tasks.</p>
              </div>
              <Link
                href="/bank-run"
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 shrink-0"
              >
                <Play className="h-3 w-3" />
                Run Session
              </Link>
            </div>
            <div className="px-5">
              {activeTasks.length > 0 ? (
                <ul className="divide-y divide-zinc-800">
                  {activeTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                        <ProfileKeyBotIcon profileKey={t.profileKey} className="h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs font-medium text-zinc-200">{t.profileKey}</p>
                        <p className="truncate text-[10px] text-zinc-600">{t.claimedBy ?? 'unclaimed'} · {t.createdByEmail}</p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase ${STATUS_COLOR[t.status] ?? 'bg-zinc-800 text-zinc-400'}`}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No active sessions.{' '}
                  <Link href="/bank-run" className="text-emerald-400 hover:underline underline-offset-4">
                    Start one from Run Session.
                  </Link>
                </p>
              )}
            </div>
          </div>

          {/* Profiles quick list */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-zinc-200">Profiles</h2>
              {isAdmin && (
                <Link href="/banks" className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0">
                  Manage →
                </Link>
              )}
            </div>
            {banks.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-zinc-500">
                {isAdmin
                  ? <><span>No profiles. </span><Link href="/banks" className="text-emerald-400 hover:underline">Add one.</Link></>
                  : 'No profiles available.'}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {banks.slice(0, 12).map((m) => (
                  <li key={m.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
                      <ProfileKeyBotIcon profileKey={m.profileKey} className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs font-medium text-zinc-200">{m.profileKey}</p>
                      <p className="truncate font-mono text-[10px] text-zinc-600">{m.mobileNumber}</p>
                    </div>
                  </li>
                ))}
                {banks.length > 12 && (
                  <li className="px-5 py-3">
                    <Link href="/banks" className="text-xs text-zinc-500 hover:text-zinc-300">
                      +{banks.length - 12} more →
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
