import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${getOpsApiBaseUrl()}/bot-tasks/${id}`, {
    method: 'DELETE',
    headers: auth,
    cache: 'no-store',
  });

  const data = await res.json() as unknown;
  return NextResponse.json(data, { status: res.status });
}
