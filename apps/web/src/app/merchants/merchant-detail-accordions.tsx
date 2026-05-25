'use client';

import { ChevronDown, Pencil, Shield } from 'lucide-react';
import {
  MerchantCredentialsPanel,
  type MerchantDetailPlain,
} from './merchant-credentials-panel';
import { MerchantEditForm } from './merchant-edit-form';

const summaryRow =
  'flex cursor-pointer list-none items-center gap-2 border-b border-zinc-800 px-5 py-4 text-sm font-medium text-zinc-200 select-none [&::-webkit-details-marker]:hidden';

export function MerchantDetailAccordions({
  detail,
  defaultOpenEdit,
  onEditSuccess,
}: {
  detail: MerchantDetailPlain;
  /** From `?edit=1` — opens the Edit section (e.g. from registry query params). */
  defaultOpenEdit: boolean;
  /** Called after a successful save when embedded (e.g. refetch detail in registry accordion). */
  onEditSuccess?: () => void;
}) {
  return (
    <div className="space-y-3">
      <details open className="rounded-xl border border-zinc-800 bg-zinc-900">
        <summary className={summaryRow}>
          <Shield size={14} className="shrink-0 text-emerald-500" aria-hidden />
          <span>Credentials</span>
          <span className="ml-auto text-xs font-normal text-zinc-500">View &amp; copy</span>
          <ChevronDown
            size={16}
            className="shrink-0 text-zinc-500 opacity-70"
            aria-hidden
          />
        </summary>
        <div className="p-5">
          <MerchantCredentialsPanel detail={detail} />
        </div>
      </details>

      <details
        open={defaultOpenEdit}
        id="merchant-edit"
        className="rounded-xl border border-zinc-800 bg-zinc-900"
      >
        <summary className={summaryRow}>
          <Pencil size={14} className="shrink-0 text-violet-400" aria-hidden />
          <span>Edit profile</span>
          <span className="ml-auto text-xs font-normal text-zinc-500">Bank, Telegram, password</span>
          <ChevronDown
            size={16}
            className="shrink-0 text-zinc-500 opacity-70"
            aria-hidden
          />
        </summary>
        <MerchantEditForm detail={detail} embedded onSuccessAfterSave={onEditSuccess} />
      </details>
    </div>
  );
}
