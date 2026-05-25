import { redirect } from 'next/navigation';
import { getBearerHeaders } from '@/lib/auth-cookies';
import { getOpsApiBaseUrl } from '@/lib/ops-api';
import { PageShell } from '@/components/page-shell';
import { CreateMerchantForm } from './create-form';
import { MerchantDirectoryList, type MerchantDirectoryRow } from './merchant-directory-list';

export const dynamic = 'force-dynamic';

async function fetchMe(): Promise<{ role: string } | null> {
  const auth = await getBearerHeaders();
  if (!auth) return null;
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/auth/me`, { headers: auth, cache: 'no-store' });
  if (!res.ok) return null;
  return (await res.json()) as { role: string };
}

async function fetchMerchantsAdmin(): Promise<MerchantDirectoryRow[]> {
  const auth = await getBearerHeaders();
  if (!auth) return [];
  const base = getOpsApiBaseUrl();
  const res = await fetch(`${base}/paytm-merchants/admin`, { headers: auth, cache: 'no-store' });
  if (!res.ok) return [];
  return (await res.json()) as MerchantDirectoryRow[];
}

function isUpi(profileKey: string) {
  const u = profileKey.toUpperCase();
  return u.includes('GOOGLE') || u.startsWith('TP_PAYTM') || u.startsWith('PAYTM') || u.startsWith('TP_PHONEPE');
}

export default async function MerchantsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ open?: string | string[]; edit?: string | string[] }>;
}) {
  const me = await fetchMe();
  if (!me) redirect('/access');
  if (me.role !== 'admin') redirect('/merchant-run');

  const sp = await searchParams;
  const openRaw = Array.isArray(sp.open) ? sp.open[0] : sp.open;
  const editRaw = Array.isArray(sp.edit) ? sp.edit[0] : sp.edit;
  const initialOpenMerchantId =
    typeof openRaw === 'string' && /^[0-9a-f-]{36}$/i.test(openRaw) ? openRaw : null;
  const initialOpenEdit = editRaw === '1' || editRaw === 'true';

  const rows = await fetchMerchantsAdmin();

  const upiCount  = rows.filter((r) => isUpi(r.profileKey)).length;
  const bankCount = rows.length - upiCount;

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Vendor Registry</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Expand a row for credentials and edits. Use Generate or Delete from the toolbar without leaving this page.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Left: stats + list */}
          <div className="space-y-4">

            {/* Stat chips */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Bank',        count: bankCount, color: 'text-zinc-200',    bg: 'bg-zinc-900 border-zinc-800' },
                { label: 'UPI Wallet',  count: upiCount,  color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800/40' },
              ].map((s) => (
                <div key={s.label} className={`rounded-xl border ${s.bg} px-4 py-3`}>
                  <p className="text-xs font-medium text-zinc-500">{s.label}</p>
                  <p className={`mt-1 text-2xl font-bold tabular-nums ${s.color}`}>{s.count}</p>
                </div>
              ))}
            </div>

            <MerchantDirectoryList
              rows={rows}
              initialOpenMerchantId={initialOpenMerchantId}
              initialOpenEdit={initialOpenMerchantId ? initialOpenEdit : false}
            />
          </div>

          {/* Right: add form */}
          <div>
            <CreateMerchantForm />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
