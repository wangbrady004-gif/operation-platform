'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, TriangleAlert, X } from 'lucide-react';

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open || busy) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-500 disabled:opacity-50'
      : 'bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50';

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overscroll-none p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden
        onClick={busy ? undefined : onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {variant === 'danger' ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-950/80 text-red-400">
                <TriangleAlert className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 id="confirm-dialog-title" className="text-sm font-semibold text-zinc-50">
                {title}
              </h2>
              <p id="confirm-dialog-desc" className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                {description}
              </p>
            </div>
          </div>
          {!busy ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition"
            >
              <X size={15} aria-hidden />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap justify-end gap-2 px-5 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${confirmClass}`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
