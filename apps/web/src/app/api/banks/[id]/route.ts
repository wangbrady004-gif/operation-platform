import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

/** Proxies ops API admin merchant detail (secrets) using the browser session cookie. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getBearerHeaders();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/banks/admin/${id}`, {
    headers: auth,
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: text || res.statusText },
      { status: res.status },
    );
  }
  const data = (await res.json()) as unknown;
  return NextResponse.json(data);
}
