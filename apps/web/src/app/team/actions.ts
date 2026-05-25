'use server';

import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export type CreateOpsUserResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

export async function createOpsUser(
  _prev: CreateOpsUserResult | null,
  formData: FormData,
): Promise<CreateOpsUserResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '').trim();

  if (!email || !password || !role) {
    return { ok: false, message: 'Email, password, and role are required.' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'Password must be at least 8 characters.' };
  }
  if (!['viewer', 'operator', 'admin'].includes(role)) {
    return { ok: false, message: 'Invalid role selected.' };
  }

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/auth/users`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const raw = await res.text();
      try {
        const j = JSON.parse(raw) as { message?: string | string[] };
        const m = j.message;
        const msg = Array.isArray(m) ? m.join(' · ') : m;
        return {
          ok: false,
          message: msg?.trim() || `${res.status}: ${raw.slice(0, 160)}`,
        };
      } catch {
        return { ok: false, message: `${res.status}: ${raw.slice(0, 200)}` };
      }
    }
    return { ok: true, email };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}

export type ToggleUserStatusResult =
  | { ok: true }
  | { ok: false; message: string };

export async function toggleUserStatus(
  userId: string,
  status: 'active' | 'inactive',
): Promise<ToggleUserStatusResult> {
  const auth = await getBearerHeaders();
  if (!auth) redirect('/access');

  if (!userId || (status !== 'active' && status !== 'inactive')) {
    return { ok: false, message: 'Invalid request.' };
  }

  try {
    const base = getOpsApiBaseUrl();
    const res = await fetch(`${base}/auth/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const raw = await res.text();
      try {
        const j = JSON.parse(raw) as { message?: string | string[] };
        const m = j.message;
        const msg = Array.isArray(m) ? m.join(' · ') : m;
        return {
          ok: false,
          message: msg?.trim() || `${res.status}: ${raw.slice(0, 160)}`,
        };
      } catch {
        return { ok: false, message: `${res.status}: ${raw.slice(0, 200)}` };
      }
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, message: msg };
  }
}
