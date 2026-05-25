'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { PageShell } from '@/components/page-shell';

// ── Config ─────────────────────────────────────────────────────────────────────
const LIVE_API             = 'https://api.trustpays24.com/v1/bankResponse/create-bot-message-bulk';
const HARDCODED_COMPANY    = '0713c005-b255-4892-8276-604215113b83';
const HARDCODED_MERCHANT   = 'pp1';
const HARDCODED_ACCESS_CODE = 'ADMIN123123';

const BUILD_SERVER_URL =
  (process.env.NEXT_PUBLIC_BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';
const BUILD_API_KEY =
  (process.env.NEXT_PUBLIC_BUILD_API_KEY as string | undefined) ?? '';

// ── Types ──────────────────────────────────────────────────────────────────────
type ServerStatus = 'checking' | 'online' | 'offline';
type BuildResult  = 'done' | 'error' | null;
type LoginType    = 'gmail_pass' | 'paytm_login' | 'mobile_only';

type FieldDef = {
  key: string;
  label: string;
  required: boolean;
  type?: 'text' | 'password';
  placeholder?: string;
};

type BankConfig = {
  label: string;
  settingsKey: string;
  module: string;
  loginType: LoginType;
  extraFields?: FieldDef[];
  navWithKey?: boolean;
};

const f = (key: string, label: string, opts: Partial<FieldDef> = {}): FieldDef => ({
  key, label, required: true, type: 'text', ...opts,
});

const BANK_CONFIGS: BankConfig[] = [
  {
    label: 'Google Pay',
    settingsKey: 'GOOGLE',
    module: 'tp_127_google_main',
    loginType: 'gmail_pass',
    extraFields: [f('last_utr_chat_id', 'Chat ID')],
  },
  {
    label: 'Paytm',
    settingsKey: 'PAYTM',
    module: 'tp_127_paytm_main',
    loginType: 'paytm_login',
    extraFields: [f('last_utr_chat_id', 'Chat ID')],
  },
  // {
  //   label: 'PhonePe',
  //   settingsKey: 'PHONEPE',
  //   module: 'tp_127_phonepe_main',
  //   loginType: 'mobile_only',
  //   extraFields: [f('mobile_number', 'Mobile Number', { required: true })],
  // },
];

const CRED_FIELDS: Record<LoginType, FieldDef[]> = {
  gmail_pass:  [f('gmail_id', 'Gmail ID'), f('password', 'Password', { type: 'password' })],
  paytm_login: [
    f('mobile_number', 'Mobile Number'),
    f('password', 'Password', { type: 'password' }),
  ],
  mobile_only: [],
};

const STAGE_LABELS = [
  'Sending credentials…',
  'Compiling binary…',
  'Packaging modules…',
  'Finalising…',
];



// ── Small UI helpers ───────────────────────────────────────────────────────────
function Label({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}{required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  'min-h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60';

function TextInput({ value, onChange, placeholder, disabled, mono }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(inputCls, mono && 'font-mono')}
    />
  );
}

function PasswordInput({ value, onChange, placeholder, disabled }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        className={cn(inputCls, 'pr-10')}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 disabled:pointer-events-none"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function GenerateExePage() {
  const [bank, setBank]             = useState<BankConfig | null>(null);
  const [dropOpen, setDropOpen]     = useState(false);
  const [accountKey, setAccountKey] = useState('');
  const [bankId, setBankId]         = useState('');
  const [values, setValues]         = useState<Record<string, string>>({});
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');
  const [building, setBuilding]         = useState(false);
  const [buildResult, setBuildResult]   = useState<BuildResult>(null);
  const [buildError, setBuildError]     = useState('');
  const [stageIdx, setStageIdx]         = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { checkServer(); }, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const allFields: FieldDef[] = bank
    ? [...(CRED_FIELDS[bank.loginType] ?? []), ...(bank.extraFields ?? [])]
    : [];

  const requiredFilled =
    !!bank &&
    accountKey.trim() !== '' &&
    bankId.trim() !== '' &&
    allFields.filter((fd) => fd.required).every((fd) => values[fd.key]?.trim());

  const fileName = bank && accountKey
    ? `${bank.label.replace(/\s+/g, '_').toUpperCase()}_${accountKey.trim().toUpperCase()}.exe`
    : 'bot_script.exe';

  async function checkServer() {
    setServerStatus('checking');
    try {
      const res = await fetch(`${BUILD_SERVER_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      setServerStatus(res.ok ? 'online' : 'offline');
    } catch {
      setServerStatus('offline');
    }
  }

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function selectBank(b: BankConfig) {
    setBank(b);
    setValues({});
    setDropOpen(false);
  }

  async function handleBuild() {
    if (!requiredFilled || building) return;
    if (serverStatus !== 'online') {
      toast.error('Build server is offline. Start exe_build_server.py first.');
      return;
    }
    setBuilding(true);
    setBuildResult(null);
    setBuildError('');
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_LABELS.length - 1));
    }, 18000);

    try {
      const allValues: Record<string, string> = {
        ...values,
        bank_id: bankId.trim(),
        api: LIVE_API,
        company: HARDCODED_COMPANY,
        merchant: HARDCODED_MERCHANT,
      };

      const res = await fetch(`${BUILD_SERVER_URL}/api/generate-exe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(BUILD_API_KEY && { 'X-Build-Api-Key': BUILD_API_KEY }),
        },
        body: JSON.stringify({
          accountKey: accountKey.trim(),
          module: bank!.module,
          settingsKey: bank!.settingsKey,
          loginType: bank!.loginType,
          hasInitial: false,
          navWithKey: bank!.navWithKey ?? false,
          accessCode: HARDCODED_ACCESS_CODE,
          values: allValues,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? 'Build failed');
      }

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setBuildResult('done');
      toast.success(`${fileName} downloaded.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setBuildError(msg);
      setBuildResult('error');
      toast.error(msg);
    } finally {
      setBuilding(false);
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Generate EXE</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Compile a standalone bot executable for a vendor machine.
          </p>
        </div>

        {/* Build server status */}
        <div className={cn(
          'flex items-center gap-2.5 rounded-xl border px-4 py-3',
          serverStatus === 'online'  ? 'border-emerald-900/60 bg-emerald-950/30' :
          serverStatus === 'offline' ? 'border-rose-900/60 bg-rose-950/30' :
                                       'border-zinc-800 bg-zinc-900',
        )}>
          {serverStatus === 'checking' && <Loader2 size={13} className="animate-spin text-zinc-500" />}
          {serverStatus === 'online'   && <Wifi    size={13} className="text-emerald-500" />}
          {serverStatus === 'offline'  && <WifiOff size={13} className="text-rose-500" />}
          <span className={cn(
            'text-xs font-medium',
            serverStatus === 'online'  ? 'text-emerald-400' :
            serverStatus === 'offline' ? 'text-rose-400' : 'text-zinc-500',
          )}>
            {serverStatus === 'checking' && 'Checking build server…'}
            {serverStatus === 'online'   && 'Build server online'}
            {serverStatus === 'offline'  && 'Build server offline — start exe_build_server.py first'}
          </span>
          {serverStatus !== 'checking' && (
            <button onClick={checkServer} className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300">
              <RefreshCw size={10} /> Retry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* ── Left col ── */}
          <div className="space-y-4">

            {/* Step 1 – Bot type */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">1 — Bot type</p>
              </div>
              <div className="p-5">
                <div
                  ref={dropRef}
                  className={cn(
                    'overflow-hidden rounded-xl bg-zinc-950 transition',
                    dropOpen
                      ? 'shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)] ring-1 ring-zinc-700'
                      : 'border border-zinc-700 hover:border-zinc-600',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => !building && setDropOpen((v) => !v)}
                    disabled={building}
                    className="w-full flex items-center justify-between px-3 min-h-11 text-sm text-left transition focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className={bank ? 'text-zinc-100' : 'text-zinc-500'}>
                      {bank ? bank.label : 'Select bot type…'}
                    </span>
                    <ChevronDown size={14} className={cn('shrink-0 text-zinc-500 transition-transform', dropOpen && 'rotate-180')} />
                  </button>

                  {dropOpen && (
                    <div className="border-t border-zinc-800">
                      {BANK_CONFIGS.map((b) => (
                        <button
                          key={b.label}
                          type="button"
                          onClick={() => selectBank(b)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-left text-sm transition',
                            bank?.label === b.label
                              ? 'bg-emerald-950/50 text-emerald-300 font-medium'
                              : 'text-zinc-300 hover:bg-zinc-800/60',
                          )}
                        >
                          <span>{b.label}</span>
                          {bank?.label === b.label && <Check size={13} className="text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Step 2 – Account info */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">2 — Account</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label label="Account Key" required hint="Short identifier (e.g. KHAN_PAY)" />
                    <TextInput value={accountKey} onChange={setAccountKey} placeholder="e.g. KHAN_PAY" disabled={building} mono />
                  </div>
                  <div className="space-y-1.5">
                    <Label label="Bank Account ID" required hint="UUID from the bank account record" />
                    <TextInput value={bankId} onChange={setBankId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" disabled={building} mono />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 – Credentials */}
            {bank && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <p className="text-sm font-medium text-zinc-200">3 — Credentials</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {allFields.map((fd) => (
                      <div key={fd.key} className="space-y-1.5">
                        <Label label={fd.label} required={fd.required} />
                        {fd.type === 'password' ? (
                          <PasswordInput value={values[fd.key] ?? ''} onChange={(v) => setValue(fd.key, v)} disabled={building} />
                        ) : (
                          <TextInput value={values[fd.key] ?? ''} onChange={(v) => setValue(fd.key, v)} placeholder={fd.placeholder} disabled={building} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right col – build panel ── */}
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">Generate</p>
              </div>
              <div className="p-5 space-y-4">
                {!bank && (
                  <p className="text-xs text-zinc-500">Select a bot type to begin.</p>
                )}
                {bank && !requiredFilled && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2.5">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300">Fill in all required fields.</p>
                  </div>
                )}
                {bank && (
                  <p className="text-[11px] font-mono text-zinc-500 break-all">{fileName}</p>
                )}
                <button
                  onClick={handleBuild}
                  disabled={!requiredFilled || building || serverStatus !== 'online'}
                  className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {building
                    ? <><Loader2 size={14} className="animate-spin" /> Building…</>
                    : <><Download size={14} /> Generate &amp; Download EXE</>
                  }
                </button>
                {building && (
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 flex items-start gap-2">
                    <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-emerald-500" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-emerald-300">{STAGE_LABELS[stageIdx]}</p>
                      <p className="text-[11px] text-zinc-500">Usually 30–90 seconds.</p>
                    </div>
                  </div>
                )}
                {buildResult === 'done' && (
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">EXE downloaded</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Deploy the EXE to the target machine.</p>
                    </div>
                  </div>
                )}
                {buildResult === 'error' && (
                  <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-4 py-3 space-y-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-rose-300">
                      <AlertTriangle size={13} /> Build failed
                    </p>
                    <p className="text-[11px] text-rose-400 font-mono whitespace-pre-wrap break-all">{buildError}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">How it works</p>
              <ol className="space-y-2.5 text-xs text-zinc-500">
                {[
                  'Select the bot type — Google Pay or Paytm.',
                  'Enter the account key, bank account ID, and credentials.',
                  'Click Generate — the build server compiles a standalone EXE.',
                  'Download and deploy to the target machine.',
                  'Bot starts and reports back through the control plane.',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
