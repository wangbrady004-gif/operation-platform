import Link from 'next/link';
import { Activity, Bot, Store, Users, Play, AlertTriangle } from 'lucide-react';
import { fetchOpsHealth, getOpsApiBaseUrl } from '@/lib/ops-api';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { AdminRequeueStuckHome } from '@/app/jobs/admin-requeue-stuck-home';
import { AutomationSessionsList } from '@/app/automation-sessions-list';
import { PageShell } from '@/components/page-shell';
import { ProfileKeyBotIcon } from '@/components/profile-key-bot-icon';

export const dynamic = 'force-dynamic';

type JobsApiRow = {
  id: string;
  scriptRelativePath: string;
  state: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
  payload: unknown | null;
  logLineCount?: number;
  cancellationRequestedAt?: string | null;
};

type MerchantRow = {
  id: string;
  profileKey: string;
  mobileNumber: string;
  portalListingMid: string | null;
  executableRelativePath: string | null;
};

function sessionTitle(job: JobsApiRow): string {
  const p = job.payload;
  if (
    p !== null && typeof p === 'object' && !Array.isArray(p) &&
    'kind' in p && (p as { kind: string }).kind === 'paytm'
  ) {
    const profile = (p as { profile?: string }).profile?.trim();
    return profile ? `Session · ${profile}` : 'Automation session';
  }
  const path = job.scriptRelativePath || '';
  const base = path.includes('/') ? path.split('/').pop() || path : path;
  return base || 'Session';
}

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
    sky: 'text-sky-400 bg-sky-950/50',
    amber: 'text-amber-400 bg-amber-950/50',
    zinc: 'text-zinc-400 bg-zinc-800',
  };
  const val: Record<string, string> = {
    emerald: 'text-emerald-300',
    sky: 'text-sky-300',
    amber: 'text-amber-300',
    zinc: 'text-zinc-200',
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

export default async function Home() {
  const health = await fetchOpsHealth();
  const apiBase = getOpsApiBaseUrl();
  const servicesOk = health.ok;

  const auth = await getBearerHeaders();
  let isAdmin = false;
  let canStopAutomation = false;
  let userRole = '';
  if (auth) {
    const res = await fetch(`${apiBase}/auth/me`, { headers: auth, cache: 'no-store' });
    if (res.ok) {
      const u = (await res.json()) as { role?: string; email?: string };
      userRole = u.role ?? '';
      isAdmin = u.role === 'admin';
      canStopAutomation = u.role === 'operator' || u.role === 'admin';
    }
  }

  let runningJobCount = 0;
  let waitingJobCount = 0;
  let totalJobCount = 0;
  let recentSessions: JobsApiRow[] = [];
  if (auth) {
    const jr = await fetch(`${apiBase}/jobs`, { headers: auth, cache: 'no-store' });
    if (jr.ok) {
      const list = (await jr.json()) as JobsApiRow[];
      totalJobCount = list.length;
      runningJobCount = list.filter((j) => j.state === 'running').length;
      waitingJobCount = list.filter((j) => j.state === 'queued' || j.state === 'starting').length;
      recentSessions = list.slice(0, 30);
    }
  }

  let merchants: MerchantRow[] = [];
  if (auth && isAdmin) {
    const mr = await fetch(`${apiBase}/paytm-merchants/admin`, { headers: auth, cache: 'no-store' });
    if (mr.ok) merchants = (await mr.json()) as MerchantRow[];
  } else if (auth) {
    const mr = await fetch(`${apiBase}/paytm-merchants`, { headers: auth, cache: 'no-store' });
    if (mr.ok) merchants = (await mr.json()) as MerchantRow[];
  }

  const activeSessions = recentSessions.filter(
    (j) => j.state === 'running' || j.state === 'queued' || j.state === 'starting',
  );

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
            <span className={`h-2 w-2 rounded-full shrink-0 ${servicesOk ? 'bg-emerald-500' : 'bg-red-500'}`} aria-hidden />
            <span className={`text-xs font-medium ${servicesOk ? 'text-emerald-400' : 'text-red-400'}`}>
              {servicesOk ? 'API online' : 'API offline'}
            </span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active"
            value={runningJobCount}
            sub={runningJobCount === 0 ? 'All idle' : `${runningJobCount} running`}
            accent="emerald"
            icon={<Bot className="h-5 w-5" />}
          />
          <StatCard
            label="Waiting"
            value={waitingJobCount}
            sub="In queue"
            accent={waitingJobCount > 0 ? 'amber' : 'zinc'}
            icon={<Activity className="h-5 w-5" />}
          />
          <StatCard
            label="Profiles"
            value={merchants.length}
            sub="Registered"
            accent="sky"
            icon={<Store className="h-5 w-5" />}
          />
          <StatCard
            label="Total sessions"
            value={totalJobCount}
            sub="All time"
            accent="zinc"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Active sessions alert */}
        {activeSessions.length > 0 && (
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 px-4 py-3 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <p className="text-sm font-medium text-emerald-300">
              {activeSessions.length} session{activeSessions.length > 1 ? 's' : ''} active right now
            </p>
            <Link
              href="/merchant-run"
              className="ml-auto flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              <Play className="h-3 w-3" aria-hidden />
              Run Session
            </Link>
          </div>
        )}

        {!auth && (
          <div className="rounded-xl border border-amber-900 bg-amber-950/30 px-4 py-3 flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-200">Not authenticated. <Link href="/access" className="font-medium underline">Sign in</Link> to see live data.</p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Sessions list */}
          <div className="min-w-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-medium text-zinc-200">Recent Sessions</h2>
                  <p className="mt-0.5 text-xs text-zinc-500">Latest {recentSessions.length} sessions. Click for full logs.</p>
                </div>
                <Link
                  href="/merchant-run"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 shrink-0"
                >
                  <Play className="h-3 w-3" />
                  New
                </Link>
              </div>
              <div className="px-5">
                {recentSessions.length > 0 ? (
                  <AutomationSessionsList
                    canStop={canStopAutomation}
                    sessions={recentSessions.map((job) => {
                      const created = new Date(job.createdAt);
                      const timeLabel = Number.isNaN(created.getTime())
                        ? job.createdAt
                        : created.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
                      return {
                        id: job.id,
                        title: sessionTitle(job),
                        state: job.state,
                        timeLabel,
                        logLineCount: job.logLineCount ?? 0,
                        cancellationRequestedAt: job.cancellationRequestedAt ?? null,
                      };
                    })}
                  />
                ) : (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No sessions yet.{' '}
                    <Link href="/merchant-run" className="text-emerald-400 hover:underline underline-offset-4">
                      Start one from Run Session.
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Merchant quick list */}
          <div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium text-zinc-200">Profiles</h2>
                {isAdmin && (
                  <Link
                    href="/merchants"
                    className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0"
                  >
                    Manage →
                  </Link>
                )}
              </div>
              {merchants.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-zinc-500">
                  {isAdmin ? (
                    <>No profiles. <Link href="/merchants" className="text-emerald-400 hover:underline">Add one.</Link></>
                  ) : 'No profiles available.'}
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800">
                  {merchants.slice(0, 12).map((m) => (
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
                  {merchants.length > 12 && (
                    <li className="px-5 py-3">
                      <Link href="/merchants" className="text-xs text-zinc-500 hover:text-zinc-300">
                        +{merchants.length - 12} more →
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </div>

            {isAdmin && <AdminRequeueStuckHome runningCount={runningJobCount} />}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
