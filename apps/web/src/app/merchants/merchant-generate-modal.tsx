'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ClipboardCopy,
  Download,
  Loader2,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react';

type Phase = 'idle' | 'building' | 'done' | 'error';

const STAGE_LABELS = [
  'Sending credentials…',
  'Compiling binary…',
  'Packaging modules…',
  'Finalising…',
];

export function MerchantGenerateModal({
  id,
  profileKey,
  onClose,
}: {
  id: string;
  profileKey: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [stageIdx, setStageIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && phase !== 'building') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  async function handleGenerate() {
    if (phase === 'building') return;
    setPhase('building');
    setErrorMsg('');
    setAccessCode('');
    setStageIdx(0);
    stageTimer.current = setInterval(() => {
      setStageIdx((i) => Math.min(i + 1, STAGE_LABELS.length - 1));
    }, 18000);

    try {
      const res = await fetch(`/api/merchants/${id}/generate`, { method: 'POST' });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const code = res.headers.get('X-Access-Code') ?? '';
      const fileName = res.headers.get('X-File-Name') ?? `${profileKey}.exe`;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
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

  const canClose = phase !== 'building';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-4 w-4 text-violet-400" aria-hidden />
            <h2 className="text-sm font-semibold text-zinc-100">Generate EXE</h2>
          </div>
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

        <div className="p-5 space-y-4">
          {/* Profile info */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Profile</p>
            <p className="mt-1 font-mono text-sm font-medium text-zinc-200">{profileKey}</p>
          </div>

          {/* Idle state */}
          {phase === 'idle' && (
            <p className="text-xs text-zinc-400">
              This will compile a standalone worker executable using the stored credentials and
              return an access code. Keep the access code safe — it activates the worker.
            </p>
          )}

          {/* Building */}
          {phase === 'building' && (
            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 flex items-start gap-3">
              <Loader2 size={14} className="mt-0.5 shrink-0 animate-spin text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-emerald-300">{STAGE_LABELS[stageIdx]}</p>
                <p className="mt-0.5 text-[11px] text-zinc-500">Usually 30–90 seconds. Do not close this window.</p>
              </div>
            </div>
          )}

          {/* Done */}
          {phase === 'done' && accessCode && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-4 py-3 flex items-start gap-2">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">EXE downloaded successfully</p>
                  <p className="mt-0.5 text-[11px] text-zinc-400">Deploy the file to the target vendor machine.</p>
                </div>
              </div>

              {/* Access code box */}
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
                  closing this dialog. The vendor will need it to activate the worker on their machine.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 flex items-start gap-2">
              <TriangleAlert size={14} className="mt-0.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-medium text-red-300">Generation failed</p>
                <p className="mt-0.5 font-mono text-[11px] text-red-400 break-all">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Actions */}
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
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition"
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
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={phase === 'building'}
                  className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {phase === 'building' ? (
                    <><Loader2 size={13} className="animate-spin" /> Building…</>
                  ) : (
                    <><Terminal size={13} /> Generate EXE</>
                  )}
                </button>
                {phase !== 'building' && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
