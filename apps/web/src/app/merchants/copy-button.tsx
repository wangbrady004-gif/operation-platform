'use client';

import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Check, Copy } from 'lucide-react';

export function CopyButton({
  value,
  label = 'Copy',
}: {
  value: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast.success(label === 'Copy' || label === 'Copied' ? 'Copied to clipboard' : label, {
        id: 'clipboard-copy',
        duration: 2000,
      });
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
      toast.error('Could not copy', {
        id: 'clipboard-copy-error',
        description: 'Clipboard permission denied or unavailable.',
      });
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={done ? 'Copied' : label}
      title={done ? 'Copied' : label}
      className="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-600 px-2 py-2 text-xs font-medium hover:bg-zinc-800"
    >
      {done ? (
        <Check className="h-4 w-4 text-emerald-400" aria-hidden />
      ) : (
        <Copy className="h-4 w-4 opacity-80" aria-hidden />
      )}
    </button>
  );
}
