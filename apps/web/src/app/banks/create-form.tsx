'use client';

import { useActionState, useEffect, useMemo, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Store, Globe, Eye, EyeOff, ChevronDown, Search, X, Bot } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createBank, type BankFormResult } from './actions';
import { cn } from '@/lib/cn';

// ── Bank catalogue ────────────────────────────────────────────────────────────

type LoginType =
  | 'gmail_pass'
  | 'paytm_login'
  | 'user_pass'
  | 'user_id_pass'
  | 'corp_user_pass'
  | 'mobile_only'
  | 'mobile_pin';

type BankType = {
  id: string;
  label: string;
  group: string;
  profilePrefix: string;
  loginType: LoginType;
  domain?: string;
};

const BANKS: BankType[] = [
  // UPI / Wallets
  { id: 'gmail_wallet', label: 'UPI (Gmail)',   group: 'UPI / Wallets',        profilePrefix: 'GOOGLE_',       loginType: 'gmail_pass',     domain: 'pay.google.com' },
  { id: 'upi_app',      label: 'UPI (App)',     group: 'UPI / Wallets',        profilePrefix: 'PAYTM_',        loginType: 'paytm_login' },
  { id: 'phonepe',  label: 'PhonePe',         group: 'UPI / Wallets',        profilePrefix: 'PHONEPE_',      loginType: 'mobile_only',    domain: 'phonepe.com' },
  // IOB
  { id: 'iob_rtl',  label: 'IOB – Retail',    group: 'Indian Overseas Bank', profilePrefix: 'IOB_RTL_',      loginType: 'user_pass',      domain: 'iob.in' },
  { id: 'iob_per',  label: 'IOB – Personal',  group: 'Indian Overseas Bank', profilePrefix: 'IOB_PER_',      loginType: 'user_pass',      domain: 'iob.in' },
  // DCB
  { id: 'dcb',      label: 'DCB – Retail',    group: 'DCB Bank',             profilePrefix: 'DCB_',          loginType: 'user_id_pass',   domain: 'dcbbank.com' },
  { id: 'dcb_cop',  label: 'DCB – Corporate', group: 'DCB Bank',             profilePrefix: 'DCB_COP_',      loginType: 'user_id_pass',   domain: 'dcbbank.com' },
  // BOI
  { id: 'boi',      label: 'BOI – Retail',    group: 'Bank of India',        profilePrefix: 'BOI_',          loginType: 'user_pass',      domain: 'bankofindia.co.in' },
  { id: 'boi_cop',  label: 'BOI – Corporate', group: 'Bank of India',        profilePrefix: 'BOI_COP_',      loginType: 'corp_user_pass', domain: 'bankofindia.co.in' },
  { id: 'boi_omin', label: 'BOI – OMNI',      group: 'Bank of India',        profilePrefix: 'BOI_OMIN_',     loginType: 'user_pass',      domain: 'bankofindia.co.in' },
  // CBI
  { id: 'cbi',      label: 'CBI – Retail',    group: 'Central Bank',         profilePrefix: 'CBI_',          loginType: 'user_id_pass',   domain: 'centralbankofindia.co.in' },
  { id: 'cbi_eez',  label: 'CBI – EEZ',       group: 'Central Bank',         profilePrefix: 'CBI_EEZ_',      loginType: 'user_id_pass',   domain: 'centralbankofindia.co.in' },
  // IDBI
  { id: 'idbi',     label: 'IDBI – Retail',   group: 'IDBI Bank',            profilePrefix: 'IDBI_',         loginType: 'user_id_pass',   domain: 'idbi.com' },
  // IndusInd
  { id: 'ind',      label: 'IndusInd Bank',   group: 'IndusInd',             profilePrefix: 'IND_',          loginType: 'user_pass',      domain: 'indusind.com' },
  // KVB
  { id: 'kvb',      label: 'KVB Bank',        group: 'KVB',                  profilePrefix: 'KVB_',          loginType: 'user_pass',      domain: 'kvb.co.in' },
  // CSB
  { id: 'csb',      label: 'CSB Bank',        group: 'CSB',                  profilePrefix: 'CSB_',          loginType: 'user_pass',      domain: 'csb.co.in' },
  // TMB
  { id: 'tmb',      label: 'TMB Bank',        group: 'TMB',                  profilePrefix: 'TMB_',          loginType: 'user_pass',      domain: 'tmb.in' },
  // TJSB
  { id: 'tjsb',     label: 'TJSB Bank',       group: 'TJSB',                 profilePrefix: 'TJSB_',         loginType: 'user_id_pass',   domain: 'tjsbbank.com' },
  // UCO
  { id: 'uco',      label: 'UCO Bank',        group: 'UCO Bank',             profilePrefix: 'UCO_',          loginType: 'user_pass',      domain: 'ucobank.com' },
  // Suryoday
  { id: 'sury',     label: 'Suryoday Bank',   group: 'Suryoday',             profilePrefix: 'SURY_',         loginType: 'user_pass',      domain: 'suryodaybank.com' },
  // Saraswat
  { id: 'saraswat', label: 'Saraswat Bank',   group: 'Saraswat',             profilePrefix: 'SARASWAT_',     loginType: 'user_id_pass',   domain: 'saraswatbank.com' },
  // Bandhan
  { id: 'bandhan',  label: 'Bandhan Bank',    group: 'Bandhan',              profilePrefix: 'BANDHAN_',      loginType: 'user_pass',      domain: 'bandhanbank.com' },
];

const GROUPS = Array.from(new Set(BANKS.map((b) => b.group)));

function primaryLabel(loginType: LoginType): string | null {
  switch (loginType) {
    case 'paytm_login':   return null;
    case 'gmail_pass':    return 'Gmail address';
    case 'user_pass':     return 'Username';
    case 'user_id_pass':  return 'User ID';
    case 'corp_user_pass': return 'Username';
    case 'mobile_only':   return 'Mobile number';
    case 'mobile_pin':    return 'Mobile number';
  }
}

// ── Favicon icon ──────────────────────────────────────────────────────────────

function BankLogo({ bank, size = 16 }: { bank: BankType; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!bank.domain || failed) {
    return bank.loginType === 'gmail_pass'
      ? <Globe size={size} className="shrink-0 text-sky-400" />
      : <Store size={size} className="shrink-0 text-zinc-400" />;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${bank.domain}&sz=64`}
      alt=""
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-sm object-contain"
    />
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

const iClass =
  'mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</p>;
}

function PassInput({ name, placeholder, autoComplete = 'new-password' }: { name: string; placeholder?: string; autoComplete?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        required
        autoComplete={autoComplete}
        placeholder={placeholder ?? '••••••••'}
        className={`${iClass} pr-9`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function SubmitBtn({ refreshing }: { refreshing: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || refreshing;
  return (
    <button
      type="submit"
      disabled={busy}
      className="mt-2 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-45"
    >
      {pending ? 'Saving…' : refreshing ? 'Updating list…' : 'Add profile'}
    </button>
  );
}

// ── Bank type picker ──────────────────────────────────────────────────────────

function BankTypePicker({ value, onChange }: { value: BankType | null; onChange: (b: BankType | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out: BankType[] = [];
    for (const b of BANKS) {
      if (b.label.toLowerCase().includes(q) || b.group.toLowerCase().includes(q)) out.push(b);
    }
    return out;
  }, [query]);

  const groups = useMemo(() => {
    if (filtered) {
      const map = new Map<string, BankType[]>();
      filtered.forEach((b) => {
        if (!map.has(b.group)) map.set(b.group, []);
        map.get(b.group)!.push(b);
      });
      return map;
    }
    return new Map(GROUPS.map((g) => [g, BANKS.filter((b) => b.group === g)]));
  }, [filtered]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
          open ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-zinc-800' : 'border-zinc-700 bg-zinc-800',
        )}
      >
        {value ? (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-700">
              <BankLogo bank={value} size={14} />
            </span>
            <span className="flex-1 text-left text-zinc-100">{value.label}</span>
            <span className="text-xs text-zinc-500">{value.group}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-zinc-500">Select bank / account type…</span>
        )}
        <ChevronDown size={14} className={cn('shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {/* Search */}
          <div className="border-b border-zinc-800 p-2">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-2.5 py-2">
              <Search size={13} className="shrink-0 text-zinc-500" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search bank…"
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-600 outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="text-zinc-500 hover:text-zinc-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            {Array.from(groups.entries()).map(([grp, items]) => (
              <div key={grp} className="mb-1">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">{grp}</p>
                {items.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => { onChange(b); setOpen(false); setQuery(''); }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition',
                      value?.id === b.id
                        ? 'bg-emerald-950/60 text-emerald-300'
                        : 'text-zinc-300 hover:bg-zinc-800',
                    )}
                  >
                    <BankLogo bank={b} size={14} />
                    <span className="flex-1">{b.label}</span>
                  </button>
                ))}
              </div>
            ))}
            {groups.size === 0 && (
              <p className="px-3 py-6 text-center text-sm text-zinc-500">No matches for "{query}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export function CreateBankForm() {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [state, action] = useActionState(createBank, null as BankFormResult | null);
  const [bank, setBank] = useState<BankType | null>(null);
  const [profileKey, setProfileKey] = useState('');

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Profile saved', { id: 'bank-create', description: 'Profile added to directory.' });
      setBank(null);
      setProfileKey('');
      // Refresh the server component so the directory list shows the new profile.
      startRefresh(() => router.refresh());
      return;
    }
    toast.error('Could not save', { id: 'bank-create-err', description: state.message });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const handleBankChange = (b: BankType | null) => {
    setBank(b);
    setProfileKey(b ? b.profilePrefix : '');
  };

  const credLabel = bank ? (primaryLabel(bank.loginType) ?? '') : 'Gmail / Mobile / User';
  const showCreds = !bank || bank.loginType !== 'paytm_login';

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-4">
        <Bot className="h-4 w-4 text-emerald-500" aria-hidden />
        <h2 className="text-sm font-medium text-zinc-200">Add profile</h2>
      </div>

      <div className="p-5">
        <form action={action} className="flex flex-col gap-4">
          {/* Hidden loginType */}
          <input type="hidden" name="loginType" value={bank?.loginType ?? ''} />

          {/* Bank type */}
          <div>
            <Label>Bank type</Label>
            <div className="mt-1.5">
              <BankTypePicker value={bank} onChange={handleBankChange} />
            </div>
          </div>

          {/* Account name */}
          <div>
            <Label>Account name</Label>
            <input
              name="profileKey"
              required
              value={profileKey}
              onChange={(e) => setProfileKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              placeholder={bank ? `${bank.profilePrefix}NAME` : 'ACCOUNT_NAME'}
              className={`font-mono ${iClass}`}
            />
          </div>

          {/* Primary credential — hidden for wallet app login */}
          {showCreds && credLabel && (
            <div>
              <Label>{credLabel}</Label>
              <input
                name="mobileNumber"
                required
                placeholder={
                  bank?.loginType === 'gmail_pass' ? 'example@gmail.com'
                  : bank?.loginType === 'user_id_pass' ? 'User ID'
                  : bank?.loginType === 'mobile_only' ? '9999900000'
                  : 'Username'
                }
                className={`font-mono ${iClass}`}
              />
            </div>
          )}

          {/* Password — hidden for wallet app login */}
          {showCreds && (
            <div>
              <Label>Password</Label>
              <PassInput name="password" placeholder="Account password" />
            </div>
          )}

          {/* Bank UUID */}
          <div>
            <Label>Bank account UUID</Label>
            <input
              name="bankId"
              required
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className={`font-mono ${iClass}`}
            />
          </div>

          {/* Telegram chat ID */}
          <div>
            <Label>Telegram chat ID</Label>
            <input
              name="lastUtrChatId"
              required
              placeholder="-1001234567890"
              className={`font-mono ${iClass}`}
            />
          </div>

          <SubmitBtn refreshing={refreshing} />
        </form>

        {state?.ok === false && (
          <p className="mt-4 text-sm text-red-400">{state.message}</p>
        )}
        {state?.ok === true && (
          <p className="mt-4 text-sm text-emerald-400">Profile saved.</p>
        )}
      </div>
    </section>
  );
}
