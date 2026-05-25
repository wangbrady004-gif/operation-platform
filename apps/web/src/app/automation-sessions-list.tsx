'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Radio } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import {
  automationBadgeClass,
  automationBadgeLabel,
} from '@/lib/job-state-ui';
import { stopAutomationSessionAction } from '@/app/jobs/actions';

export type AutomationSessionRow = {
  id: string;
  title: string;
  state: string;
  timeLabel: string;
  logLineCount: number;
  cancellationRequestedAt: string | null;
};

function SessionTerminateButton({
  jobId,
  state,
  cancellationRequestedAt,
}: {
  jobId: string;
  state: string;
  cancellationRequestedAt: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [inFlight, setInFlight] = useState(false);

  const phase =
    state === 'running'
      ? 'running'
      : state === 'starting' || state === 'queued'
        ? 'starting'
        : null;

  if (!phase) return null;

  const disable =
    pending ||
    inFlight ||
    (phase === 'running' && cancellationRequestedAt != null);

  let label: string;
  if (pending || inFlight) {
    label = '…';
  } else if (phase === 'running' && cancellationRequestedAt) {
    label = 'Stopping…';
  } else if (phase === 'running') {
    label = 'Stop';
  } else {
    label = 'Cancel';
  }

  return (
    <button
      type="button"
      disabled={disable}
      title={
        phase === 'starting'
          ? 'Remove session before the worker attaches'
          : 'Ask the worker to shut down the bot'
      }
      onClick={() => {
        if (disable) return;
        setInFlight(true);
        start(async () => {
          try {
            const r = await stopAutomationSessionAction(jobId);
            if (!r.ok) {
              toast.error('Could not end session', {
                id: `stop-row-${jobId}`,
                description: r.message,
              });
              return;
            }
            toast.success(
              phase === 'starting' ? 'Session cancelled' : 'Stop requested',
              {
                id: `stop-row-${jobId}`,
                description:
                  phase === 'starting'
                    ? 'Removed before the worker started.'
                    : 'Status updates when the worker finishes shutdown.',
              },
            );
            router.refresh();
          } finally {
            setInFlight(false);
          }
        });
      }}
      className="shrink-0 rounded-lg border border-rose-800 bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-rose-100 shadow-sm hover:bg-rose-950/50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}

export function AutomationSessionsList({
  sessions,
  canStop,
}: {
  sessions: AutomationSessionRow[];
  canStop: boolean;
}) {
  return (
    <ul className="mt-4 divide-y divide-zinc-100 divide-zinc-800">
      {sessions.map((job) => {
        const live = job.state === 'running';
        const showTerminate =
          canStop &&
          (job.state === 'running' ||
            job.state === 'starting' ||
            job.state === 'queued');
        return (
          <li key={job.id}>
            <div className="flex min-h-[3.25rem] items-center gap-2 py-3 first:pt-0 sm:gap-3 sm:py-3.5">
              <Link
                href={`/jobs/${job.id}`}
                className="flex min-w-0 flex-1 items-center gap-3 transition hover:bg-zinc-50/90 hover:bg-zinc-800/40 sm:gap-4 rounded-lg -mx-1 px-1"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex min-w-0 items-center gap-2">
                    {live ? (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white bg-emerald-500"
                        title="Live logs available on session page"
                      >
                        <Radio className="h-3 w-3" aria-hidden />
                        Live
                      </span>
                    ) : null}
                    <span className="truncate font-medium text-zinc-900 text-zinc-50">
                      {job.title}
                    </span>
                  </span>
                  <span className="truncate font-mono text-[11px] text-zinc-500 text-zinc-400">
                    {job.id} · {job.logLineCount} log lines
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${automationBadgeClass(job.state)}`}
                >
                  {automationBadgeLabel(job.state)}
                </span>
                <span className="hidden shrink-0 text-xs text-zinc-500 sm:block text-zinc-400">
                  {job.timeLabel}
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-zinc-400"
                  aria-hidden
                />
              </Link>
              {showTerminate ? (
                <SessionTerminateButton
                  jobId={job.id}
                  state={job.state}
                  cancellationRequestedAt={job.cancellationRequestedAt}
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
