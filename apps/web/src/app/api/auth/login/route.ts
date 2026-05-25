import { NextRequest, NextResponse } from 'next/server';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import { attachSessionToken } from '@/lib/session-cookie';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  const token = (data as { access_token?: string }).access_token;
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ message: 'No token from API' }, { status: 502 });
  }
  const out = NextResponse.json({ ok: true });
  attachSessionToken(out, token);
  return out;
}
