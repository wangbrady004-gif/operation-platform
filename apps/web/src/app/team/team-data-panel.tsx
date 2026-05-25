'use client';

import { useCallback, useEffect, useState } from 'react';
import { TeamMembersList, type TeamMemberRow } from './team-members-list';
import { TeamOnboardForm } from './team-onboard-form';

type OpsUser = {
  id: string;
  email: string;
  role: string;
  status?: string;
  createdAt?: string;
};

type LoadState =
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'ok'; rows: TeamMemberRow[] };

export function TeamDataPanel({ viewerEmail }: { viewerEmail: string }) {
  const [state, setState] = useState<LoadState>({ phase: 'loading' });

  const reload = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true;
    if (!soft) {
      setState({ phase: 'loading' });
    }
    try {
      const res = await fetch('/api/team/users', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const raw = await res.text();
      if (!res.ok) {
        let message = `${res.status} ${res.statusText}`;
        try {
          const j = JSON.parse(raw) as { message?: string; detail?: string };
          const m = j.message;
          if (m) message = m;
          if (typeof j.detail === 'string') message += ` — ${j.detail}`;
        } catch {
          if (raw) message = raw.slice(0, 400);
        }
        if (soft) {
          return;
        }
        setState({ phase: 'error', message });
        return;
      }
      const users = JSON.parse(raw) as OpsUser[];
      if (!Array.isArray(users)) {
        if (!soft) {
          setState({ phase: 'error', message: 'Unexpected response shape from /api/team/users.' });
        }
        return;
      }
      const rows: TeamMemberRow[] = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        status: u.status === 'inactive' ? 'inactive' : 'active',
      }));
      setState({ phase: 'ok', rows });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!soft) {
        setState({
          phase: 'error',
          message: msg || 'Network error loading team.',
        });
      }
    }
  }, []);

  const mergeRowStatus = useCallback((userId: string, status: 'active' | 'inactive') => {
    setState((s) => {
      if (s.phase !== 'ok') return s;
      return {
        phase: 'ok',
        rows: s.rows.map((r) => (r.id === userId ? { ...r, status } : r)),
      };
    });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const rows = state.phase === 'ok' ? state.rows : [];
  const admins = rows.filter((u) => u.role === 'admin');
  const operators = rows.filter((u) => u.role === 'operator');
  const viewers = rows.filter((u) => u.role === 'viewer');
  const activeCount = rows.filter((u) => u.status === 'active').length;
  const inactiveCount = rows.filter((u) => u.status === 'inactive').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Team</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage operator and viewer accounts. Each person gets their own credentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {state.phase === 'loading' && (
            <div className="space-y-4" aria-busy aria-label="Loading team">
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                  >
                    <div className="h-3 w-16 rounded bg-zinc-800" />
                    <div className="mt-3 h-8 w-10 rounded bg-zinc-800/80" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
                  >
                    <div className="h-3 w-14 rounded bg-zinc-800" />
                    <div className="mt-3 h-8 w-10 rounded bg-zinc-800/80" />
                  </div>
                ))}
              </div>
              <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <div className="h-4 w-36 rounded bg-zinc-800" />
                </div>
                <ul className="divide-y divide-zinc-800">
                  {[1, 2, 3].map((i) => (
                    <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-800" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 max-w-[220px] rounded bg-zinc-800" />
                        <div className="h-3 w-28 rounded bg-zinc-800/70" />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {state.phase === 'error' && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              <p className="font-medium text-red-100">Could not load team</p>
              <p className="mt-1 text-xs text-red-200/90">{state.message}</p>
              <button
                type="button"
                onClick={() => void reload()}
                className="mt-3 rounded-lg border border-red-800/60 bg-red-950/50 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {state.phase === 'ok' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Admins',
                    count: admins.length,
                    color: 'text-violet-300',
                    bg: 'bg-violet-950/40 border-violet-800/40',
                  },
                  {
                    label: 'Operators',
                    count: operators.length,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-950/40 border-emerald-800/40',
                  },
                  {
                    label: 'Viewers',
                    count: viewers.length,
                    color: 'text-zinc-300',
                    bg: 'bg-zinc-900 border-zinc-800',
                  },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border ${s.bg} px-4 py-3`}>
                    <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${s.color}`}>{s.count}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'Active',
                    count: activeCount,
                    color: 'text-emerald-400',
                    bg: 'bg-emerald-950/30 border-emerald-900/40',
                  },
                  {
                    label: 'Inactive',
                    count: inactiveCount,
                    color: 'text-zinc-400',
                    bg: 'bg-zinc-950/80 border-zinc-800',
                  },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl border ${s.bg} px-4 py-3`}>
                    <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${s.color}`}>{s.count}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <h2 className="text-sm font-medium text-zinc-200">
                    {rows.length === 0
                      ? 'No members'
                      : `${rows.length} member${rows.length === 1 ? '' : 's'}`}
                  </h2>
                </div>

                {rows.length === 0 ? (
                  <p className="px-5 py-10 text-center text-sm text-zinc-500">
                    No team members yet. Add the first one →
                  </p>
                ) : (
                  <TeamMembersList
                    users={rows}
                    viewerEmail={viewerEmail}
                    mergeRowStatus={mergeRowStatus}
                    onStatusSync={() => void reload({ soft: true })}
                  />
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                  Role permissions
                </p>
                <div className="space-y-3">
                  {[
                    {
                      role: 'Operator',
                      color: 'text-emerald-400',
                      desc: 'Run merchant sessions, view jobs and live logs. Cannot manage merchants or team.',
                    },
                    {
                      role: 'Viewer',
                      color: 'text-zinc-300',
                      desc: 'Read-only access to dashboards and session history. Cannot trigger any actions.',
                    },
                    {
                      role: 'Admin',
                      color: 'text-violet-300',
                      desc: 'Full access — merchant directory, team provisioning, and worker recovery.',
                    },
                  ].map((r) => (
                    <div key={r.role} className="flex gap-3">
                      <span className={`w-16 shrink-0 text-xs font-semibold ${r.color}`}>{r.role}</span>
                      <p className="text-xs text-zinc-500">{r.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={state.phase !== 'ok' ? 'opacity-60' : ''}>
          <TeamOnboardForm actorEmail={viewerEmail} onCreated={() => void reload({ soft: true })} />
        </div>
      </div>
    </div>
  );
}
