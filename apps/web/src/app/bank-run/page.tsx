import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import { PageShell } from '@/components/page-shell';
import { SessionsBoard, type ProfileItem } from './sessions-board';

export const dynamic = 'force-dynamic';

async function fetchMe(): Promise<{ role: string; email: string } | null> {
  const auth = await getBearerHeaders();
  if (!auth) return null;
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/auth/me`, { headers: auth, cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as { role: string; email: string };
}

async function fetchProfiles(): Promise<ProfileItem[]> {
  const auth = await getBearerHeaders();
  if (!auth) return [];
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/banks`, { headers: auth, cache: 'no-store' });
  if (!res.ok) return [];
  return (await res.json()) as ProfileItem[];
}

export default async function BankRunPage() {
  const me = await fetchMe();
  if (!me) redirect('/access');

  const profiles = await fetchProfiles();
  const canRun = me.role === 'operator' || me.role === 'admin';

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Run Session</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Start and stop automation sessions. Scripts run on your local machine.
          </p>
        </div>
        <SessionsBoard profiles={profiles} canRun={canRun} isAdmin={me.role === 'admin'} currentEmail={me.email} />
      </div>
    </PageShell>
  );
}
