'use client';

import { Toaster } from 'sonner';

/**
 * Global stacked toasts (Sonner). Add once in root layout — use `toast` from `@/lib/toast`.
 */
export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      expand={false}
      visibleToasts={4}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            'group border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-left-2 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:slide-out-to-right-2',
          description: 'text-zinc-400',
          success: 'bg-emerald-950/95',
          error: 'bg-red-950/95',
        },
      }}
    />
  );
}
