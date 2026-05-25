'use server';

import { revalidatePath } from 'next/cache';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import type { AnchorSubmitResult } from '@/lib/paytm-ops-jobs-shared';

export type StopAutomationResult =
  | { ok: true }
  | { ok: false; message: string };

export async function stopAutomationSessionAction(
  jobId: string,
): Promise<StopAutomationResult> {
  const id = jobId.trim();
  if (!id) return { ok: false, message: 'Missing job id' };
  const auth = await getBearerHeaders();
  if (!auth) {
    return { ok: false, message: 'Not logged in — use workspace access.' };
  }
  const base = getOpsApiBaseUrl();
  try {
    const res = await fetch(`${base}/jobs/${id}/cancel`, {
      method: 'POST',
      headers: auth,
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text.slice(0, 400)}` };
    }
    revalidatePath(`/jobs/${id}`);
    revalidatePath('/');
    revalidatePath('/merchant-run');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export async function submitDeferredAnchorsAction(
  _prev: AnchorSubmitResult | null,
  formData: FormData,
): Promise<AnchorSubmitResult> {
  const jobId = String(formData.get('jobId') ?? '').trim();
  const lastTransactionId = String(
    formData.get('lastTransactionId') ?? '',
  ).trim();
  const lastCustomerName = String(
    formData.get('lastCustomerName') ?? '',
  ).trim();
  if (!jobId) return { ok: false, message: 'Missing job id' };
  if (!lastTransactionId) {
    return { ok: false, message: 'Order / transaction id is required' };
  }
  const auth = await getBearerHeaders();
  if (!auth) {
    return { ok: false, message: 'Not logged in — use workspace access.' };
  }
  const base = getOpsApiBaseUrl();
  try {
    const body: Record<string, string> = { lastTransactionId };
    if (lastCustomerName) body.lastCustomerName = lastCustomerName;
    const res = await fetch(`${base}/jobs/${jobId}/paytm-anchors`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, message: `${res.status}: ${text}` };
    }
    revalidatePath(`/jobs/${jobId}`);
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
