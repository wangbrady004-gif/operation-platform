'use client';

import { AlertTriangle, Loader2, ServerOff, Wifi } from 'lucide-react';
import type { BuildServerStatus } from '@/lib/use-build-server';

/**
 * Compact build-server status badge.
 * Use `compact` in headers/toolbars; default shows fuller offline/warning blocks.
 */
export function BuildServerStatusBadge({
  status,
  compact = false,
}: {
  status: BuildServerStatus;
  compact?: boolean;
}) {
  if (status.state === 'checking') {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Loader2 size={11} className="animate-spin shrink-0" />
        Checking build server…
      </div>
    );
  }

  if (status.state === 'offline') {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-red-400" title={status.error}>
          <ServerOff size={11} className="shrink-0" />
          <span className="font-medium">Build server offline</span>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2">
        <ServerOff size={13} className="mt-0.5 shrink-0 text-red-400" />
        <div>
          <p className="text-xs font-semibold text-red-300">Build server offline</p>
          <p className="mt-0.5 text-[11px] text-red-400/80">{status.error}</p>
        </div>
      </div>
    );
  }

  if (!status.isWindows) {
    const msg = `Online (${status.platform}) — use Windows for .exe builds`;
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-400" title={msg}>
          <AlertTriangle size={11} className="shrink-0" />
          <span className="font-medium max-w-[10rem] truncate">{msg}</span>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
        <div>
          <p className="text-xs font-semibold text-amber-300">
            Build server online · {status.platform}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-400/80">
            Running on {status.platform} — generated files will only work on {status.platform}.
            Move the build server to Windows to produce .exe files.
          </p>
        </div>
      </div>
    );
  }

  if (!status.hasInstaller) {
    if (compact) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-400" title="PyInstaller not found on build machine">
          <AlertTriangle size={11} className="shrink-0" />
          <span className="font-medium">PyInstaller missing</span>
        </div>
      );
    }
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-900/50 bg-amber-950/20 px-3 py-2">
        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" />
        <div>
          <p className="text-xs font-semibold text-amber-300">Build server online</p>
          <p className="mt-0.5 text-[11px] text-amber-400/80">
            PyInstaller not found — run{' '}
            <code className="font-mono">pip install pyinstaller</code> on the build machine.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Wifi size={11} className="shrink-0 text-emerald-500" />
      <span className="text-emerald-400 font-medium">Build server online</span>
    </div>
  );
}

/**
 * Returns true when a build should be blocked (offline or no installer).
 */
export function buildServerBlocked(status: BuildServerStatus): boolean {
  if (status.state === 'checking') return false;
  if (status.state === 'offline') return true;
  return !status.hasInstaller;
}
