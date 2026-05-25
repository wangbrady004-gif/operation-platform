'use client';

import { useState, useTransition } from 'react';
import { Ban, Loader2, Shield, User, UserRoundCheck } from 'lucide-react';
import { toast } from '@/lib/toast';
import { toggleUserStatus, type ToggleUserStatusResult } from './actions';

const ROLE_BADGE: Record<string, string> = {
  admin:
    'bg-violet-950/60 text-violet-300 border border-violet-800/50',
  operator:
    'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50',
  viewer: 'bg-zinc-800 text-zinc-400 border border-zinc-700',
};

export type TeamMemberRow = {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
};

export function TeamMembersList({
  users,
  viewerEmail,
  mergeRowStatus,
  onStatusSync,
}: {
  users: TeamMemberRow[];
  viewerEmail: string;
  mergeRowStatus: (userId: string, status: 'active' | 'inactive') => void;
  onStatusSync?: () => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function patchStatus(
    userId: string,
    email: string,
    next: 'active' | 'inactive',
    previous: 'active' | 'inactive',
  ) {
    mergeRowStatus(userId, next);
    startTransition(async () => {
      setPendingId(userId);
      try {
        const r: ToggleUserStatusResult = await toggleUserStatus(userId, next);
        if (r.ok) {
          onStatusSync?.();
          toast.success(next === 'inactive' ? 'Deactivated' : 'Reactivated', {
            description: email,
            id: `user-status-${userId}`,
            duration: 2200,
          });
        } else {
          mergeRowStatus(userId, previous);
          toast.error('Could not update status', {
            description: r.message,
            id: `user-status-err-${userId}`,
          });
        }
      } catch (e) {
        mergeRowStatus(userId, previous);
        toast.error('Could not update status', {
          description: e instanceof Error ? e.message : String(e),
          id: `user-status-err-${userId}`,
        });
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <ul className="divide-y divide-zinc-800">
      {users.map((u) => {
        const isMe = u.email === viewerEmail;
        const created = u.createdAt ? new Date(u.createdAt) : null;
        const dateStr =
          created && !Number.isNaN(created.getTime())
            ? created.toLocaleDateString(undefined, { dateStyle: 'medium' })
            : null;
        const active = u.status === 'active';
        const rowBusy = pendingId === u.id;
        const prev = (u.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive';

        return (
          <li
            key={u.id}
            className={`flex flex-wrap items-center gap-3 px-5 py-3.5 transition-opacity duration-200 ease-out md:flex-nowrap md:gap-4 ${active ? '' : 'opacity-[0.72]'} ${rowBusy ? 'opacity-90' : ''}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
              {u.role === 'admin' ? (
                <Shield className="h-4 w-4 text-violet-400" />
              ) : (
                <User className="h-4 w-4 text-zinc-400" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium text-zinc-200">{u.email}</p>
                {isMe && (
                  <span className="shrink-0 rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    you
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors duration-200 ${active ? 'bg-emerald-950/70 text-emerald-400 ring-1 ring-emerald-800/50' : 'bg-zinc-800 text-zinc-500 ring-1 ring-zinc-700'}`}
                >
                  {active ? 'active' : 'inactive'}
                </span>
              </div>
              {dateStr && (
                <p className="mt-0.5 text-[11px] text-zinc-600">Joined {dateStr}</p>
              )}
            </div>
            <div className="flex w-full shrink-0 items-center gap-2 md:ml-auto md:w-auto md:justify-end">
              <span
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? ROLE_BADGE.viewer}`}
              >
                {u.role}
              </span>
              {active ? (
                <button
                  type="button"
                  disabled={rowBusy || isMe}
                  title={isMe ? 'You cannot deactivate your own account.' : 'Deactivate — block sign-in and API'}
                  aria-label={
                    isMe ? 'Deactivate disabled for your account' : `Deactivate ${u.email}`
                  }
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-400 transition-colors duration-150 hover:border-red-900/70 hover:bg-red-950/50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                  onClick={() =>
                    !isMe && patchStatus(u.id, u.email, 'inactive', prev)
                  }
                >
                  {rowBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-400" aria-hidden />
                  ) : (
                    <Ban className="h-4 w-4" aria-hidden />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={rowBusy}
                  title="Reactivate account"
                  aria-label={`Reactivate ${u.email}`}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-800 bg-emerald-950/60 text-emerald-400 transition-colors duration-150 hover:bg-emerald-900/50 disabled:pointer-events-none disabled:opacity-40"
                  onClick={() => patchStatus(u.id, u.email, 'active', prev)}
                >
                  {rowBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-400/90" aria-hidden />
                  ) : (
                    <UserRoundCheck className="h-4 w-4" aria-hidden />
                  )}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
