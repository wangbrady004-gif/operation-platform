'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ClipboardCopy,
  Download,
  Eye,
  EyeOff,
  Loader2,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react';
import { toast } from '@/lib/toast';
import {
  EXE_BUILD_COMPANY,
  EXE_BUILD_PARTNER_CODE,
  inferBankExeBuildConfig,
  bankApiEnvironmentLabel,
  bankExeLoginLabel,
  resolveBankExeApi,
} from '@/lib/bank-exe-build';
import { useBuildServerStatus } from '@/lib/use-build-server';
import { BuildServerStatusBadge, buildServerBlocked } from '@/components/build-server-status';

type Phase = 'idle' | 'building' | 'done' | 'error';

type BankDetail = {
  profileKey: string;
  mobileNumber: string;
  password: string;
  bankId: string;
  lastUtrChatId: string;
  api?: string;
  company?: string;
  merchant?: string;
};

const STAGE_LABELS = [
  'Sending credentials…',
  'Compiling binary…',
  'Packaging modules…',
  'Finalising…',
];

function ReadOnlyField({
  label,
  value,
  secret,
  mono = true,
}: {
  label: string;
  value: string;
  secret?: boolean;
  mono?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const raw = value.trim();
  const display = secret && !revealed ? '••••••••••••' : (raw || '—');
  const canCopy = Boolean(raw);

  async function copyValue() {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      toast.success(`${label} copied`, { id: `gen-copy-${label}`, duration: 1500 });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy', { id: `gen-copy-err-${label}` });
    }
  }

  return (
    <div
      role={canCopy ? 'button' : undefined}
      tabIndex={canCopy ? 0 : undefined}
      onClick={canCopy ? () => void copyValue() : undefined}
      onKeyDown={
        canCopy
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                void copyValue();
              }
            }
          : undefined
      }
      title={canCopy ? 'Click to copy' : undefined}
      className={`rounded-lg border bg-zinc-950 px-3 py-2.5 transition ${
        canCopy
          ? `cursor-pointer border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/80 ${copied ? 'border-emerald-700/60' : ''}`
          : 'border-zinc-800'
      }`}
    >
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <div className="mt-1 flex items-start gap-2">
        <p className={`min-w-0 flex-1 break-all text-xs text-zinc-200 ${mono ? 'font-mono' : ''}`}>
          {display}
        </p>
        {secret && raw && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRevealed((v) => !v);
            }}
            className="shrink-0 text-zinc-600 hover:text-zinc-300 transition"
            aria-label={revealed ? 'Hide value' : 'Show value'}
          >
            {revealed ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function BankGenerateModal({
  id,
  onClose,
}: {
  id: string;
  /** Kept for callers; build preview uses fetched merchant detail. */
  profileKey?: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [stageIdx, setStageIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  const [detail, setDetail] = useState<BankDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState('');

  const buildServer = useBuildServerStatus();

  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  const buildServerReady = buildServer.state !== 'checking';
  const isInitializing = detailLoading || !buildServerReady;

  const buildCfg = detail ? inferBankExeBuildConfig(detail.profileKey) : null;
  const outputFileName = detail ? `${detail.profileKey}.exe` : '—';
  const apiUrl = detail ? resolveBankExeApi(detail.api) : '';
  const companyId = detail?.company?.trim() || EXE_BUILD_COMPANY;
  const bankPartnerCode = detail?.merchant?.trim() || EXE_BUILD_PARTNER_CODE;
  const apiEnv = apiUrl ? bankApiEnvironmentLabel(apiUrl) : '';

  useEffect(() => {
    setPhase('idle');
    setErrorMsg('');
    setAccessCode('');
    setStageIdx(0);
    setCopied(false);
    setDetail(null);
    setDetailLoading(true);
    setDetailError('');

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/banks/${id}`, { credentials: 'same-origin' });
        const body = (await res.json()) as BankDetail & { error?: string };
        if (!res.ok) {
          throw new Error(body.error ?? res.statusText ?? 'Failed to load bank profile');
        }
        if (!cancelled) setDetail(body);
      } catch (e) {
        if (!cancelled) {
          setDetailError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyPadding = body.style.paddingRight;

    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.overflow = prevBodyOverflow;
      html.style.overflow = prevHtmlOverflow;
      body.style.paddingRight = prevBodyPadding;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'building') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  async function handleGenerate() {
    if (phase === 'building' || !detail || !buildCfg) return;

    const fileName = `${detail.profileKey}.exe`;
    setPhase('building');
    setErrorMsg('');
    setAccessCode('');
    setStageIdx(0);

    stageTimer.current = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_LABELS.length - 1));
    }, 18000);

    try {
      const res = await fetch(`/api/banks/${id}/generate`, { method: 'POST' });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const code     = res.headers.get('X-Access-Code') ?? '';
      const respName = res.headers.get('X-File-Name') ?? fileName;
      const blob     = await res.blob();

      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = respName;
      a.click();
      URL.revokeObjectURL(url);

      setAccessCode(code);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    } finally {
      if (stageTimer.current) clearInterval(stageTimer.current);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(accessCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const isBuilding = phase === 'building';
  const canClose = !isBuilding;
  const canGenerate = Boolean(
    detail && buildCfg && !isInitializing && !detailError && !buildServerBlocked(buildServer),
  );
  const showConfigFields = detail && !isInitializing && !isBuilding;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-none p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="generate-exe-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm touch-none"
        aria-hidden
        onClick={canClose ? onClose : undefined}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      />

      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Terminal className="h-4 w-4 shrink-0 text-violet-400" aria-hidden />
            <h2 id="generate-exe-title" className="text-sm font-semibold text-zinc-100">
              Generate EXE
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isBuilding && buildServerReady && (
              <BuildServerStatusBadge status={buildServer} compact />
            )}
            {canClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {!isBuilding && (
            <div>
              <p className="text-xs font-medium text-zinc-500">Build Configuration</p>
            </div>
          )}

          {isInitializing && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-500">
              <Loader2 size={14} className="animate-spin" />
              Loading configuration…
            </div>
          )}

          {detailError && !isInitializing && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 flex items-start gap-2">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{detailError}</p>
            </div>
          )}

          {showConfigFields && (
            <div className="grid gap-2 sm:grid-cols-2">
              <ReadOnlyField label="Profile Key" value={detail.profileKey} />
              <ReadOnlyField label="Output File" value={outputFileName} />
              {buildCfg ? (
                <>
                  <ReadOnlyField label="Login Type" value={buildCfg.loginType} />
                  <ReadOnlyField
                    label={bankExeLoginLabel(buildCfg.loginType)}
                    value={detail.mobileNumber}
                  />
                  <ReadOnlyField label="Password" value={detail.password} secret />
                </>
              ) : (
                <div className="sm:col-span-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2.5">
                  <p className="text-xs text-amber-300">
                    Generate EXE is only supported for UPI wallet profiles.
                  </p>
                </div>
              )}
              <ReadOnlyField label="Bank ID" value={detail.bankId} />
              <ReadOnlyField label="Telegram Chat ID" value={detail.lastUtrChatId} />
              <ReadOnlyField label={`API URL (${apiEnv})`} value={apiUrl} mono={false} />
              <ReadOnlyField label="Company ID" value={companyId} />
              <ReadOnlyField label="Partner Code" value={bankPartnerCode} mono={false} />
            </div>
          )}

          {phase === 'idle' && canGenerate && (
            <p className="text-xs text-zinc-400">
              Confirm the fields above, then generate. You will receive a download and a one-time
              access code to activate the worker.
            </p>
          )}

          {isBuilding && (
            <div className="space-y-4">
              {/* Animated progress bar */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div className="h-full w-1/2 animate-[shimmer_1.6s_ease-in-out_infinite] rounded-full bg-emerald-500/70" />
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-950 ring-1 ring-emerald-800/50">
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">
                      Compiling <span className="font-mono text-emerald-300">{outputFileName}</span>
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{STAGE_LABELS[stageIdx]}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-800 pt-3 flex items-start gap-2">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Usually 30–90 seconds. Do not close this window.
                  </p>
                </div>
              </div>
            </div>
          )}

          {phase === 'done' && accessCode && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 flex items-start gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">EXE downloaded successfully</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">Deploy the file to the target vendor machine.</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Access Code</p>
                </div>
                <div className="flex items-center gap-3">
                  <code className="flex-1 rounded-lg border border-amber-900/40 bg-zinc-950 px-4 py-3 font-mono text-xl font-bold tracking-[0.2em] text-amber-300 select-all">
                    {accessCode}
                  </code>
                  <button
                    type="button"
                    onClick={copyCode}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-900/40 bg-amber-950/40 text-amber-400 hover:bg-amber-950 transition"
                  >
                    {copied ? <Check size={15} /> : <ClipboardCopy size={15} />}
                  </button>
                </div>
                <p className="text-[11px] text-amber-400/70 leading-relaxed">
                  Copy and save this access code somewhere safe. It will not be shown again after
                  closing this dialog.
                </p>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 flex items-start gap-2">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Generation failed</p>
                <p className="mt-0.5 font-mono text-[11px] text-red-400 break-all">{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-1">
            {phase === 'done' ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  <Download size={13} />
                  Re-generate
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ml-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition"
                >
                  Done
                </button>
              </>
            ) : phase === 'error' ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Terminal size={13} />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </>
            ) : isBuilding ? null : (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Terminal size={13} />
                  Generate EXE
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!portalReady) return null;
  return createPortal(modal, document.body);
}
