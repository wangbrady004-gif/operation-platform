import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import { PageShell } from '@/components/page-shell';
import { TeamDataPanel } from './team-data-panel';

export const dynamic = 'force-dynamic';

async function fetchMe(): Promise<{ role: string; email: string } | null> {
  const auth = await getBearerHeaders();
  if (!auth) return null;
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/auth/me`, { headers: auth, cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as { role: string; email: string };
}

export default async function TeamPage() {
  const me = await fetchMe();
  if (!me) redirect('/access');
  if (me.role !== 'admin') redirect('/merchant-run');

  return (
    <PageShell>
      <TeamDataPanel viewerEmail={me.email} />
    </PageShell>
  );
}
