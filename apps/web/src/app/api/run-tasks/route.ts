import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export async function GET() {
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${getOpsApiBaseUrl()}/bot-tasks`, {
    headers: auth,
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json([], { status: res.status });
  return NextResponse.json(await res.json());
}

export async function POST(req: Request) {
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as unknown;
  const res = await fetch(`${getOpsApiBaseUrl()}/bot-tasks`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
