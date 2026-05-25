'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CopyButton } from './copy-button';

export type MerchantDetailPlain = {
  id: string;
  profileKey: string;
  mobileNumber: string;
  password: string;
  bankId: string;
  api: string;
  company: string;
  lastUtrChatId: string;
  merchant: string;
  portalListingMid: string | null;
  txnPass: string;
  executableRelativePath: string | null;
};

function credLabel(profileKey: string): string {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) return 'Gmail address';
  if (u.startsWith('DCB') || u.startsWith('CBI') || u.startsWith('IDBI') || u.startsWith('SARASWAT') || u.startsWith('TJSB') ||
      u.startsWith('TP_DCB') || u.startsWith('TP_CBI') || u.startsWith('TP_IDBI') || u.startsWith('TP_SARASWAT') || u.startsWith('TP_TJSB')) {
    return 'User ID';
  }
  return 'Username / mobile';
}

function isPaytmKey(profileKey: string): boolean {
  const u = profileKey.toUpperCase();
  return u.startsWith('TP_PAYTM') || u.startsWith('PAYTM');
}

function CredField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const display = secret && !revealed ? '••••••••••••' : (value || '—');

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-sm text-zinc-200">{display}</code>
        {secret && value && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="shrink-0 text-zinc-600 hover:text-zinc-300 transition"
          >
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        {value && <CopyButton value={value} />}
      </div>
    </div>
  );
}

export function MerchantCredentialsPanel({ detail }: { detail: MerchantDetailPlain }) {
  const paytm = isPaytmKey(detail.profileKey);
  const label = credLabel(detail.profileKey);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {!paytm && (
        <>
          <CredField label={label} value={detail.mobileNumber} />
          <CredField label="Password" value={detail.password} secret />
        </>
      )}
      <CredField label="Bank account UUID" value={detail.bankId} />
      <CredField label="Telegram chat ID" value={detail.lastUtrChatId} />
    </div>
  );
}
