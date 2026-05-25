import Link from 'next/link';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import { automationDetailStatus } from '@/lib/job-state-ui';
import { PageShell } from '@/components/page-shell';
import { JobLiveLogs } from '../job-live-logs';
import { MerchantAnchorPanel } from '../merchant-anchor-panel';
import { AdminRequeueRunningPanel } from '../admin-requeue-running-panel';
import { StopAutomationButton } from '../stop-automation-button';

export const dynamic = 'force-dynamic';

type JobDetail = {
  id: string;
  scriptRelativePath: string;
  state: string;
  cancellationRequestedAt: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  error: string | null;
  logs: string[];
  payload: unknown | null;
  paytmAnchorInput: {
    lastTransactionId: string;
    lastCustomerName?: string;
  } | null;
};

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getBearerHeaders();
  const base = getOpsApiBaseUrl();

  if (!auth) {
    return (
      <PageShell>
        <p className="text-sm text-red-400">Not signed in.</p>
        <Link href="/access" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
          Sign in
        </Link>
      </PageShell>
    );
  }

  let isAdmin = false;
  let canStopAutomation = false;
  const meRes = await fetch(`${base}/auth/me`, { headers: auth, cache: 'no-store' });
  if (meRes.ok) {
    const u = (await meRes.json()) as { role?: string };
    isAdmin = u.role === 'admin';
    canStopAutomation = u.role === 'operator' || u.role === 'admin';
  }

  const res = await fetch(`${base}/jobs/${id}?logTail=500`, { headers: auth, cache: 'no-store' });

  if (!res.ok) {
    return (
      <PageShell>
        <p className="text-sm text-red-400">
          {res.status === 404 ? 'Session not found.' : `Error ${res.status}`}
        </p>
        <Link href="/" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
          Back to dashboard
        </Link>
      </PageShell>
    );
  }

  const job = (await res.json()) as JobDetail;
  const isLive = job.state === 'running';
  const statusLabel = automationDetailStatus(job);

  const stopPhase: 'starting' | 'running' | null =
    job.state === 'starting' || job.state === 'queued'
      ? 'starting'
      : job.state === 'running'
        ? 'running'
        : null;

  const payloadUi =
    job.payload !== null && typeof job.payload === 'object' && !Array.isArray(job.payload)
      ? (() => {
          const o = { ...(job.payload as Record<string, unknown>) };
          if (o.kind === 'paytm') o.kind = 'merchant-job';
          return o;
        })()
      : job.payload;

  const payload = job.payload;
  const paytmPayload =
    payload != null && typeof payload === 'object' && 'kind' in payload &&
    (payload as { kind: string }).kind === 'paytm'
      ? (payload as { mode?: string; deferAnchors?: boolean })
      : null;
  const showDeferAnchorPanel =
    paytmPayload?.deferAnchors === true &&
    paytmPayload.mode !== undefined &&
    (paytmPayload.mode === 'txn' || paytmPayload.mode === 'name');

  return (
    <PageShell>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Session</p>
          <h1 className="font-mono text-sm font-medium text-zinc-300 break-all">{job.id}</h1>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-medium text-sm text-zinc-200">{statusLabel}</span>
            {job.exitCode != null && (
              <span className="text-xs text-zinc-500">exit {job.exitCode}</span>
            )}
          </div>
          <p className="font-mono text-xs text-zinc-500 break-all">{job.scriptRelativePath}</p>
          {job.error && (
            <p className="text-xs text-red-400">{job.error}</p>
          )}
          {job.payload != null && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-zinc-600">Payload</p>
              <pre className="overflow-x-auto font-mono text-xs text-zinc-400">
                {JSON.stringify(payloadUi, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {isLive && job.logs.length === 0 && !job.cancellationRequestedAt && (
          <div className="rounded-xl border border-amber-900/50 bg-amber-950/30 p-4 text-sm text-amber-200">
            <p className="font-medium text-amber-100">Live but no logs yet</p>
            <p className="mt-1.5 text-xs text-amber-300/80 leading-relaxed">
              Status shows «running» but nothing has streamed — usually a stale row (worker crashed or restarted). Ask an admin to use <strong>Reset for worker retry</strong>, keep one worker running, then watch for <code className="font-mono text-[11px]">attached session id=…</code> in the terminal.
            </p>
          </div>
        )}

        {showDeferAnchorPanel && (
          <MerchantAnchorPanel
            jobId={job.id}
            mode={paytmPayload!.mode as 'txn' | 'name'}
            jobState={job.state}
            savedAnchor={job.paytmAnchorInput}
          />
        )}

        {canStopAutomation && stopPhase && (
          <StopAutomationButton
            jobId={job.id}
            phase={stopPhase}
            cancellationRequestedAt={job.cancellationRequestedAt}
          />
        )}

        {isAdmin && isLive && <AdminRequeueRunningPanel jobId={job.id} />}

        {isLive && <JobLiveLogs jobId={id} />}

        <div className="rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 px-4 py-3">
            <p className="text-xs font-medium text-zinc-500">Log snapshot (last 500 lines)</p>
          </div>
          <pre className="max-h-[60vh] overflow-auto p-4 font-mono text-xs text-zinc-300 leading-relaxed">
            {job.logs.length ? job.logs.join('\n') : '—'}
          </pre>
        </div>
      </div>
    </PageShell>
  );
}
