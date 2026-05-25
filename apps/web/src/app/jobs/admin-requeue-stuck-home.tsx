'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import { requeueStuckJobsAdmin } from './admin-job-actions';

export function AdminRequeueStuckHome({
  runningCount,
}: {
  /** Jobs currently in DB state `running` (from GET /jobs). */
  runningCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [minutes, setMinutes] = useState(2);

  if (runningCount <= 0) return null;

  return (
    <div className="rounded-xl border border-amber-900 bg-amber-950/35 p-5">
      <h2 className="text-sm font-semibold text-amber-100">
        Worker recovery (admin)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-amber-200/90">
        There {runningCount === 1 ? 'is' : 'are'}{' '}
        <strong className="font-medium">{runningCount}</strong> session
        {runningCount === 1 ? '' : 's'} stuck on «running» while nothing on your laptop is actually driving them.
        Pending sessions stay «waiting» until a worker attaches. After API + worker are up, recover stale rows below so they become attachable again.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="stuckMinutes"
            className="mb-1 block text-xs font-medium text-amber-200"
          >
            Stuck longer than (minutes)
          </label>
          <input
            id="stuckMinutes"
            type="number"
            min={1}
            max={120}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 2)}
            className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-amber-600"
          />
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            start(async () => {
              const r = await requeueStuckJobsAdmin(minutes);
              if (!r.ok) {
                toast.error('Recovery failed', {
                  id: 'requeue-stuck',
                  description: r.message,
                });
                return;
              }
              toast.success(
                r.requeued
                  ? `Reset ${r.requeued} stuck session(s) for worker retry`
                  : 'No sessions matched that age threshold',
                {
                  id: 'requeue-stuck',
                  description:
                    'Use “Reset for worker retry” on a session page if one wedged but is newer than this cutoff.',
                },
              );
              router.refresh();
            });
          }}
          className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {pending ? '…' : 'Recover stale sessions'}
        </button>
      </div>
      <p className="mt-3 text-xs text-amber-300/85">
        Bulk recovery only affects runs older than the threshold. For one that just wedged, open that session and use «Reset for worker retry».
      </p>
    </div>
  );
}
