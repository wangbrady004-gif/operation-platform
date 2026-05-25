'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  Eye,
  EyeOff,
  Info,
  Loader2,
  Package,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { PageShell } from '@/components/page-shell';

// ── Config ─────────────────────────────────────────────────────────────────────
const BUILD_SERVER_URL =
  (process.env.NEXT_PUBLIC_BUILD_SERVER_URL as string | undefined) ?? 'http://localhost:7127';
const BUILD_API_KEY =
  (process.env.NEXT_PUBLIC_BUILD_API_KEY as string | undefined) ?? '';

const LAUNCHER_APP_TITLE = 'EXE Runner';

type ServerStatus = 'checking' | 'online' | 'offline';
type BuildPhase   = 'idle' | 'running' | 'done' | 'error';

const STAGE_LABELS = [
  'Sending config to build server…',
  'Patching launcher source…',
  'Compiling binary with PyInstaller…',
  'Finalising and bundling…',
];

// ── Small components ───────────────────────────────────────────────────────────
function SectionHeader({
  icon, title, subtitle, accent = 'blue',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: 'blue' | 'violet' | 'emerald';
}) {
  const dot: Record<string, string> = {
    blue:    'bg-blue-500',
    violet:  'bg-violet-500',
    emerald: 'bg-emerald-500',
  };
  return (
    <div className="flex items-start gap-3">
      <span className={cn('mt-0.5 rounded-md p-1.5 text-white', dot[accent])}>
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        {subtitle && <p className="text-[11px] text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="space-y-0.5">
      <label className="block text-xs font-semibold text-zinc-400 tracking-wide">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
}

function TextInput({
  value, onChange, placeholder, readOnly, mono,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-sm transition',
        readOnly
          ? 'cursor-default border-zinc-800 bg-zinc-900 text-zinc-500'
          : 'border-zinc-700 bg-zinc-800 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500',
        mono && 'font-mono',
      )}
    />
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function GenerateLauncherPage() {
  const [vendorName, setVendorName] = useState('');
  const [username,   setUsername]   = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);

  const [isGenerateBusy, setIsGenerateBusy] = useState(false);
  const [buildPhase, setBuildPhase]         = useState<BuildPhase>('idle');
  const [buildError, setBuildError]         = useState('');
  const [stageIdx,   setStageIdx]           = useState(0);

  const [serverStatus,  setServerStatus]  = useState<ServerStatus>('checking');
  const [platformLabel, setPlatformLabel] = useState('');

  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { checkServer(); }, []);

  async function checkServer() {
    setServerStatus('checking');
    try {
      const res = await fetch(`${BUILD_SERVER_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        setPlatformLabel(data.platformLabel ?? '');
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  }

  const requiredFilled = vendorName.trim() && username.trim() && password.trim();
  const busy = isGenerateBusy;

  async function handleGenerate() {
    if (!requiredFilled || busy) return;
    if (serverStatus !== 'online') {
      toast.error('Build server is offline. Start exe_build_server.py first.');
      return;
    }
    setIsGenerateBusy(true);
    setBuildPhase('running');
    setBuildError('');
    setStageIdx(0);

    stageTimer.current = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_LABELS.length - 1));
    }, 20_000);

    try {
      const res = await fetch(`${BUILD_SERVER_URL}/api/generate-launcher`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(BUILD_API_KEY && { 'X-Build-Api-Key': BUILD_API_KEY }),
        },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          username:   username.trim(),
          password:   password.trim(),
          appTitle:   LAUNCHER_APP_TITLE,
        }),
      });

      if (!res.ok) {
        let errMsg = `Build server returned ${res.status}`;
        try {
          const json = await res.json();
          errMsg = json.error ?? errMsg;
        } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const blob     = await res.blob();
      const filename = `${vendorName.trim().replace(/\s+/g, '_')}_Launcher.exe`;
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setBuildPhase('done');
      toast.success(`${filename} downloaded — share with the vendor along with their credentials.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setBuildError(msg);
      setBuildPhase('error');
      toast.error(msg);
    } finally {
      setIsGenerateBusy(false);
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  }

  return (
    <PageShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">Generate Launcher</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Build a per-vendor Launcher EXE with credentials baked in.
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
            {serverStatus === 'online' && `Build server online${platformLabel ? ` · ${platformLabel}` : ''}`}
            {serverStatus === 'offline' && 'Build server offline — start exe_build_server.py first'}
          </span>
          {serverStatus !== 'checking' && (
            <button onClick={checkServer} className="ml-auto flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300">
              <RefreshCw size={10} /> Retry
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">

          {/* ── Left: form ── */}
          <div className="space-y-4">

            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">Vendor Info</p>
                <p className="mt-0.5 text-xs text-zinc-500">Identifies the vendor and sets the EXE filename.</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel label="Vendor Name" required hint="ACME → ACME_Launcher.exe" />
                    <TextInput value={vendorName} onChange={setVendorName} placeholder="e.g. ACME" readOnly={busy} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="App Title" hint="Launcher window title — fixed." />
                    <TextInput value={LAUNCHER_APP_TITLE} readOnly />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">Credentials</p>
                <p className="mt-0.5 text-xs text-zinc-500">Baked into the EXE. Vendor enters these on the login screen.</p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <FieldLabel label="Username" required />
                    <TextInput value={username} onChange={setUsername} placeholder="vendor_username" readOnly={busy} />
                  </div>
                  <div className="space-y-1.5">
                    <FieldLabel label="Password" required />
                    <div className="relative">
                      <input
                        type={showPass ? 'text' : 'password'}
                        value={password}
                        readOnly={busy}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 pr-9 text-sm text-zinc-100 placeholder:text-zinc-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setShowPass((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 disabled:pointer-events-none"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: generate + info ── */}
          <div className="space-y-4">

            <div className="rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="border-b border-zinc-800 px-5 py-4">
                <p className="text-sm font-medium text-zinc-200">Generate</p>
              </div>
              <div className="p-5 space-y-4">
                {!requiredFilled && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/30 px-3 py-2.5">
                    <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300">Fill in all required fields.</p>
                  </div>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!requiredFilled || busy || serverStatus !== 'online'}
                  className="w-full inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <><Loader2 size={14} className="animate-spin" /> Building…</>
                  ) : (
                    <><Download size={14} /> Generate &amp; Download EXE</>
                  )}
                </button>
                {buildPhase === 'running' && (
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 flex items-start gap-2">
                    <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-emerald-500" />
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-emerald-300">{STAGE_LABELS[stageIdx]}</p>
                      <p className="text-[11px] text-zinc-500">Usually 30–90 seconds.</p>
                    </div>
                  </div>
                )}
                {buildPhase === 'done' && (
                  <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 flex items-start gap-2">
                    <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">EXE downloaded</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Send EXE to vendor; share credentials separately.</p>
                    </div>
                  </div>
                )}
                {buildPhase === 'error' && (
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
                  'Fill in vendor name and credentials, then click Generate.',
                  'Build server compiles a Launcher.exe with credentials baked in.',
                  'Send only the EXE — no config file needed.',
                  'Vendor opens EXE, sees login screen, enters username and password.',
                  'Vendor loads the bot EXE in the Launcher and clicks Launch.',
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
