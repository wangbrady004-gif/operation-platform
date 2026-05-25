/**
 * Display helpers for job/automation `state` values from the API.
 * Avoid operator-facing words like «queue» — the worker still coordinates dispatch safely in the DB.
 */

export function automationBadgeLabel(state: string): string {
  switch (state) {
    case 'queued':
    case 'starting':
      return 'Waiting';
    case 'running':
      return 'Running';
    case 'succeeded':
      return 'Done';
    case 'failed':
      return 'Failed';
    case 'cancelled':
      return 'Stopped';
    default:
      return state;
  }
}

export function automationBadgeClass(state: string): string {
  switch (state) {
    case 'running':
      return 'bg-emerald-950/80 text-emerald-100';
    case 'starting':
    case 'queued':
      return 'bg-sky-950/80 text-sky-100';
    case 'succeeded':
      return 'bg-zinc-800 text-zinc-200';
    case 'failed':
      return 'bg-red-950/70 text-red-100';
    case 'cancelled':
      return 'bg-amber-950/60 text-amber-100';
    default:
      return 'bg-zinc-800 text-zinc-200';
  }
}

/** Long sentence for the session detail header. */
export function automationDetailStatus(job: {
  state: string;
  cancellationRequestedAt: string | null;
}): string {
  const { state } = job;
  if (state === 'running' && job.cancellationRequestedAt) {
    return 'Running — stop requested; worker is shutting down';
  }
  if (state === 'running') {
    return 'Running — bot active on worker';
  }
  if (state === 'starting' || state === 'queued') {
    return 'Waiting for worker — your laptop worker will attach when it polls the API';
  }
  if (state === 'succeeded') {
    return 'Finished successfully';
  }
  if (state === 'failed') {
    return 'Finished with errors';
  }
  if (state === 'cancelled') {
    return 'Stopped';
  }
  return state;
}
