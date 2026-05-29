'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search } from 'lucide-react';
import { ProfileKeyBotIcon } from '@/components/profile-key-bot-icon';
import { BankAdminActions } from './bank-admin-actions';
import { BankDetailAccordions } from './bank-detail-accordions';
import type { BankDetailPlain } from './bank-credentials-panel';

export type BankDirectoryRow = {
  id: string;
  profileKey: string;
  mobileNumber: string;
  bankId: string;
  portalListingMid: string | null;
  executableRelativePath: string | null;
};

function rowSubtitle(profileKey: string, mobileNumber: string): string | null {
  const u = profileKey.toUpperCase();
  if (u.startsWith('TP_PAYTM') || u.startsWith('PAYTM')) return null;
  return mobileNumber || null;
}

const summaryClasses =
  'flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 text-left select-none [&::-webkit-details-marker]:hidden';

function BankRegistryRow({
  row,
  defaultExpanded,
  defaultOpenEdit,
}: {
  row: BankDirectoryRow;
  defaultExpanded: boolean;
  defaultOpenEdit: boolean;
}) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [detail, setDetail] = useState<BankDetailPlain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didScroll = useRef(false);

  useEffect(() => {
    if (!expanded) return;
    if (detail) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/banks/${row.id}`, { credentials: 'same-origin' });
        const body = (await res.json()) as BankDetailPlain & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? res.statusText ?? 'Failed to load');
        }
        if (!cancelled) setDetail(body as BankDetailPlain);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [expanded, row.id, detail]);

  useEffect(() => {
    if (!defaultExpanded || didScroll.current || !rootRef.current) return;
    didScroll.current = true;
    rootRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [defaultExpanded]);

  async function refetchDetail() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/banks/${row.id}`, { credentials: 'same-origin' });
      const body = (await res.json()) as BankDetailPlain & { error?: string };
      if (!res.ok) throw new Error(body.error ?? res.statusText ?? 'Failed to load');
      setDetail(body as BankDetailPlain);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <li>
      <details
        ref={rootRef}
        className="group border-b border-zinc-800 last:border-b-0"
        open={expanded}
        onToggle={(e) => {
          setExpanded(e.currentTarget.open);
          if (!e.currentTarget.open) {
            setError(null);
          }
        }}
      >
        <summary className={summaryClasses}>
          <ChevronDown
            size={16}
            className="shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
            aria-hidden
          />
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800">
            <ProfileKeyBotIcon profileKey={row.profileKey} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-medium text-zinc-200">{row.profileKey}</p>
            {rowSubtitle(row.profileKey, row.mobileNumber) && (
              <p className="mt-0.5 truncate font-mono text-[11px] text-zinc-600">
                {rowSubtitle(row.profileKey, row.mobileNumber)}
              </p>
            )}
          </div>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <BankAdminActions id={row.id} profileKey={row.profileKey} showViewLink={false} showEditLink={false} />
          </div>
        </summary>

        <div className="border-t border-zinc-800 bg-zinc-950/50 px-3 py-4 sm:px-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading credentials…
            </div>
          )}
          {error && !loading && (
            <p className="py-4 text-center text-sm text-red-400">
              {error}{' '}
              <button type="button" onClick={() => void refetchDetail()} className="text-emerald-400 underline">
                Retry
              </button>
            </p>
          )}
          {detail && !loading && (
            <BankDetailAccordions
              detail={detail}
              defaultOpenEdit={defaultOpenEdit}
              onEditSuccess={() => void refetchDetail()}
            />
          )}
        </div>
      </details>
    </li>
  );
}

export function BankDirectoryList({
  rows,
  initialOpenBankId,
  initialOpenEdit,
}: {
  rows: BankDirectoryRow[];
  /** Deep-link: expand this profile (`?open=<uuid>`). */
  initialOpenBankId?: string | null;
  /** With `initialOpenBankId`, open the Edit accordion (`?edit=1`). */
  initialOpenEdit?: boolean;
}) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      r.profileKey.toLowerCase().includes(s) ||
      r.mobileNumber.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s) ||
      (r.portalListingMid ?? '').toLowerCase().includes(s),
    );
  }, [rows, q]);

  const openId = initialOpenBankId ?? null;
  const wantEdit = Boolean(initialOpenEdit && openId);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-5 py-4">
        <h2 className="text-sm font-medium text-zinc-200">
          {rows.length === 0 ? 'No profiles' : `${rows.length} profile${rows.length === 1 ? '' : 's'}`}
        </h2>
        {rows.length > 0 && (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" aria-hidden />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search profile, mobile…"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-zinc-500">
          No profiles yet. Add the first one →
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-zinc-500">
          Nothing matches &ldquo;{q.trim()}&rdquo;.{' '}
          <button type="button" onClick={() => setQ('')} className="text-emerald-400 hover:underline">
            Clear
          </button>
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800">
          {filtered.map((r) => (
            <BankRegistryRow
              key={r.id}
              row={r}
              defaultExpanded={openId === r.id}
              defaultOpenEdit={wantEdit && openId === r.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
