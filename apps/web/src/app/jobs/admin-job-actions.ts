'use server';

import { revalidatePath } from 'next/cache';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export type AdminJobActionResult =
  | { ok: true; requeued?: number }
  | { ok: false; message: string };

/** Move one stuck `running` session back to waiting (`starting`) for worker retry (crash / disconnect). Admin only. */
export async function requeueRunningJobAdmin(
  jobId: string,
): Promise<AdminJobActionResult> {
  const id = jobId.trim();
  if (!id) return { ok: false, message: 'Missing job id' };
  const auth = await getBearerHeaders();
  if (!auth) {
    return { ok: false, message: 'Not logged in — use workspace access.' };
  }
  const base = getOpsApiBaseUrl();
  try {
    const res = await fetch(`${base}/jobs/admin/${id}/requeue-running`, {
      method: 'POST',
      headers: auth,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text.slice(0, 400)}` };
    }
    revalidatePath('/');
    revalidatePath(`/jobs/${id}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

/**
 * Bulk reset sessions stuck on «running» (longer than `minutes`) back to waiting (`starting`).
 * Admin only.
 */
export async function requeueStuckJobsAdmin(
  minutes: number,
): Promise<AdminJobActionResult> {
  const auth = await getBearerHeaders();
  if (!auth) {
    return { ok: false, message: 'Not logged in — use workspace access.' };
  }
  const base = getOpsApiBaseUrl();
  const m = Math.max(1, Math.min(120, Math.floor(Number(minutes)) || 2));
  try {
    const res = await fetch(
      `${base}/jobs/admin/requeue-stuck?minutes=${m}`,
      {
        method: 'POST',
        headers: auth,
        cache: 'no-store',
      },
    );
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text.slice(0, 400)}` };
    }
    const body = (await res.json()) as { requeued?: number };
    revalidatePath('/');
    return { ok: true, requeued: body.requeued ?? 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
