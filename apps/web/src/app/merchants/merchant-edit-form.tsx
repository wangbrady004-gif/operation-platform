'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';
import type { MerchantDetailPlain } from './merchant-credentials-panel';
import { updateMerchant } from './actions';

// Infer login type from profileKey to determine which fields to show
function loginTypeForKey(profileKey: string): 'gmail_pass' | 'paytm_login' | 'user_id_pass' | 'user_pass' {
  const u = profileKey.toUpperCase();
  if (u.includes('GOOGLE')) return 'gmail_pass';
  if (u.startsWith('TP_PAYTM') || u.startsWith('PAYTM')) return 'paytm_login';
  if (u.startsWith('TP_DCB') || u.startsWith('TP_CBI') || u.startsWith('TP_IDBI') || u.startsWith('TP_SARASWAT') || u.startsWith('TP_TJSB')) return 'user_id_pass';
  return 'user_pass';
}

function credLabel(lt: string): string | null {
  if (lt === 'paytm_login') return null;
  if (lt === 'gmail_pass') return 'Gmail address';
  if (lt === 'user_id_pass') return 'User ID';
  return 'Username';
}

const iClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{children}</p>;
}

function PassInput({ name, placeholder, value, onChange }: { name: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1.5">
      <input
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder={placeholder ?? '••••••••'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
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

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-45"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

export function MerchantEditForm({
  detail,
  embedded,
  onSuccessAfterSave,
}: {
  detail: MerchantDetailPlain;
  /** When true, no outer card chrome (used inside merchant detail accordions). */
  embedded?: boolean;
  /** After save when `embedded` (e.g. refetch secrets in registry list). */
  onSuccessAfterSave?: () => void;
}) {
  const router = useRouter();
  const onSuccessAfterSaveRef = useRef(onSuccessAfterSave);
  onSuccessAfterSaveRef.current = onSuccessAfterSave;
  const boundUpdate = updateMerchant.bind(null, detail.id);
  const [state, action] = useActionState(boundUpdate, null);

  const loginType = loginTypeForKey(detail.profileKey);
  const showCreds = loginType !== 'paytm_login';
  const primaryLabel = credLabel(loginType);

  const STAGING_API = 'https://staging-api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';
  const PROD_API    = 'https://api.ultrapay.live/v1/bankResponse/create-bot-message-bulk';

  const [profileKey, setProfileKey] = useState(detail.profileKey);
  const [mobileNumber, setMobileNumber] = useState(detail.mobileNumber);
  const [bankId, setBankId] = useState(detail.bankId);
  const [lastUtrChatId, setLastUtrChatId] = useState(detail.lastUtrChatId);
  const [apiUrl, setApiUrl] = useState(detail.api ?? STAGING_API);
  const [password, setPassword] = useState('');

  useEffect(() => {
    setProfileKey(detail.profileKey);
    setMobileNumber(detail.mobileNumber);
    setBankId(detail.bankId);
    setLastUtrChatId(detail.lastUtrChatId);
    setApiUrl(detail.api ?? STAGING_API);
    setPassword('');
  }, [detail]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Profile updated', { id: `edit-${detail.id}` });
      if (embedded) {
        onSuccessAfterSaveRef.current?.();
        router.refresh();
      } else {
        router.replace(`/merchants?open=${encodeURIComponent(detail.id)}`);
        router.refresh();
      }
      return;
    }
    toast.error('Could not save', { id: `edit-err-${detail.id}`, description: state.message });
  }, [state, router, detail.id, embedded]);

  const formInner = (
    <>
      <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="loginType" value={loginType} />

          {/* Account name */}
          <div>
            <Label>Account name</Label>
            <input
              name="profileKey"
              required
              value={profileKey}
              onChange={(e) => setProfileKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              className={`font-mono mt-1.5 ${iClass}`}
            />
          </div>

          {/* Primary credential */}
          {showCreds && primaryLabel && (
            <div>
              <Label>{primaryLabel}</Label>
              <input
                name="mobileNumber"
                required
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                className={`font-mono mt-1.5 ${iClass}`}
              />
            </div>
          )}

          {/* Password */}
          {showCreds && (
            <div>
              <Label>Password <span className="normal-case font-normal text-zinc-600">— leave blank to keep current</span></Label>
              <PassInput name="password" placeholder="Leave blank to keep current" value={password} onChange={setPassword} />
            </div>
          )}

          {/* Bank UUID */}
          <div>
            <Label>Bank account UUID</Label>
            <input
              name="bankId"
              required
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className={`font-mono mt-1.5 ${iClass}`}
            />
          </div>

          {/* Telegram chat ID */}
          <div>
            <Label>Telegram chat ID</Label>
            <input
              name="lastUtrChatId"
              required
              value={lastUtrChatId}
              onChange={(e) => setLastUtrChatId(e.target.value)}
              className={`font-mono mt-1.5 ${iClass}`}
            />
          </div>

          {/* API URL (staging vs production) */}
          <div>
            <Label>API URL</Label>
            <div className="mt-1.5 flex gap-2">
              <button
                type="button"
                onClick={() => setApiUrl(STAGING_API)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${apiUrl === STAGING_API ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                Staging
              </button>
              <button
                type="button"
                onClick={() => setApiUrl(PROD_API)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${apiUrl === PROD_API ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
              >
                Production
              </button>
            </div>
            <input type="hidden" name="api" value={apiUrl} />
          </div>

          <SubmitBtn />
        </form>

        {state?.ok === false && (
          <p className="mt-4 text-sm text-red-400">{state.message}</p>
        )}
    </>
  );

  if (embedded) {
    return <div className="p-5">{formInner}</div>;
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-4">
        <Pencil className="h-4 w-4 text-violet-400" aria-hidden />
        <h2 className="text-sm font-medium text-zinc-200">Edit profile</h2>
      </div>

      <div className="p-5">{formInner}</div>
    </section>
  );
}
