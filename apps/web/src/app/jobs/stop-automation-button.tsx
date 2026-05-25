'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import { stopAutomationSessionAction } from './actions';

export function StopAutomationButton({
  jobId,
  phase,
  cancellationRequestedAt,
}: {
  jobId: string;
  /** starting = waiting for worker; running = bot subprocess active */
  phase: 'starting' | 'running';
  /** From API — while running, disables repeat clicks after first stop request */
  cancellationRequestedAt?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [inFlight, setInFlight] = useState(false);

  const stopAlreadyRequested =
    phase === 'running' && cancellationRequestedAt != null;

  let label: string;
  if (pending || inFlight) {
    label = '…';
  } else if (phase === 'running' && stopAlreadyRequested) {
    label = 'Stopping…';
  } else if (phase === 'starting') {
    label = 'Cancel session';
  } else {
    label = 'Stop automation';
  }

  const disableButton =
    pending || inFlight || stopAlreadyRequested;

  return (
    <div className="rounded-xl border border-rose-900 bg-rose-950/35 p-4">
      <h2 className="text-sm font-medium text-rose-100">
        End this session
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-rose-200/90">
        {phase === 'starting'
          ? 'Cancel session removes this row immediately — the worker never picks it up.'
          : 'Stop automation asks your worker to kill the bot subprocess (typically within a fraction of a second once it polls). If Postgres shows «running» but your terminal never printed attached session id=…, there may be no live bot — use Stop automation after ~2 minutes with zero logs to clear a stale row, or Reset for worker retry.'}
      </p>
      <button
        type="button"
        disabled={disableButton}
        onClick={() => {
          if (disableButton) return;
          setMsg(null);
          setInFlight(true);
          start(async () => {
            try {
              const r = await stopAutomationSessionAction(jobId);
              if (!r.ok) {
                setMsg(r.message);
                toast.error('Could not stop session', {
                  id: `stop-${jobId}`,
                  description: r.message,
                });
                return;
              }
              toast.success(
                phase === 'starting' ? 'Session cancelled' : 'Stop requested',
                {
                  id: `stop-${jobId}`,
                  description:
                    phase === 'starting'
                      ? 'Removed before the worker started.'
                      : 'The worker terminates the bot and updates status.',
                },
              );
              router.refresh();
            } finally {
              setInFlight(false);
            }
          });
        }}
        className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      {msg ? (
        <p className="mt-2 text-xs text-red-400">{msg}</p>
      ) : null}
    </div>
  );
}
