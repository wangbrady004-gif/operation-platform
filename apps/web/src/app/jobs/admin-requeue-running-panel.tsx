'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { toast } from '@/lib/toast';
import { requeueRunningJobAdmin } from './admin-job-actions';

export function AdminRequeueRunningPanel({
  jobId,
}: {
  jobId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 8000);
    return () => clearTimeout(t);
  }, [msg]);

  return (
    <div className="rounded-xl border border-amber-900 bg-amber-950/35 p-4">
      <h2 className="text-sm font-medium text-amber-100">
        Stale «running» (worker idle / no logs)?
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-amber-200/90">
        Use this when Postgres says «running» but your worker never printed «attached session id=…» or logs stay empty — it moves the row back to «waiting» so a single fresh worker can attach.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMsg(null);
          start(async () => {
            const r = await requeueRunningJobAdmin(jobId);
            if (!r.ok) {
              setMsg(r.message);
              toast.error('Could not reset session', {
                id: `requeue-${jobId}`,
                description: r.message,
              });
              return;
            }
            toast.success('Session reset for worker retry', {
              id: `requeue-${jobId}`,
              description: 'The worker will pick this session when it polls next.',
            });
            router.refresh();
          });
        }}
        className="mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {pending ? '…' : 'Reset for worker retry'}
      </button>
      {msg ? (
        <p className="mt-2 text-xs text-red-400">{msg}</p>
      ) : null}
    </div>
  );
}
