import { NextResponse } from 'next/server';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${getOpsApiBaseUrl()}/ops-launchers/${id}/mark-update`, {
    method: 'PATCH',
    headers: auth,
    cache: 'no-store',
  });
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await getBearerHeaders();
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const res = await fetch(`${getOpsApiBaseUrl()}/ops-launchers/${id}`, {
    method: 'DELETE',
    headers: auth,
    cache: 'no-store',
  });
  return NextResponse.json({}, { status: res.status });
}
