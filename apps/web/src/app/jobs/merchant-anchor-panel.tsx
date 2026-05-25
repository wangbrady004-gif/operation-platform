'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from '@/lib/toast';
import { submitDeferredAnchorsAction } from './actions';
import type { AnchorSubmitResult } from '@/lib/paytm-ops-jobs-shared';

function SubmitAnchorsButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-emerald-500"
    >
      {pending ? '…' : 'Submit — start scraping'}
    </button>
  );
}

export function MerchantAnchorPanel({
  jobId,
  mode,
  jobState,
  savedAnchor,
}: {
  jobId: string;
  mode: 'txn' | 'name';
  jobState: string;
  savedAnchor?: {
    lastTransactionId: string;
    lastCustomerName?: string;
  } | null;
}) {
  const [state, action] = useActionState(submitDeferredAnchorsAction, null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Anchors saved', {
        id: `anchor-${jobId}`,
        description: 'The automation should continue shortly.',
      });
      return;
    }
    toast.error('Could not save anchors', {
      id: `anchor-error-${jobId}`,
      description: state.message,
    });
  }, [state, jobId]);

  const hasAnchor = Boolean(savedAnchor?.lastTransactionId?.trim());
  const showForm = jobState === 'running' && !hasAnchor;

  return (
    <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-4">
      <h2 className="text-sm font-medium text-emerald-200">
        Row anchors (paste after you are in the listings)
      </h2>
      <p className="mt-1 text-xs text-emerald-300/90">
        When the bot shows the transactions view, paste anchors below in the same order as the bot prompts:
        {mode === 'name'
          ? ' customer name first, then order / transaction id. '
          : ' order / transaction id only. '}
        Copy exactly what appears on the listing row.
      </p>

      {hasAnchor && (
        <p className="mt-3 font-mono text-xs text-emerald-900 text-emerald-100">
          {mode === 'name' && savedAnchor?.lastCustomerName ? (
            <>
              Customer: {savedAnchor.lastCustomerName}
              <br />
            </>
          ) : null}
          Submitted order id:{' '}
          <span className="break-all">{savedAnchor!.lastTransactionId}</span>
        </p>
      )}

      {showForm && (
        <form action={action} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="jobId" value={jobId} />
          {mode === 'name' ? (
            <div>
              <label
                htmlFor="anchorName"
                className="mb-1 block text-xs font-medium text-emerald-900 text-emerald-200"
              >
                Customer name (as on merchant portal)
              </label>
              <input
                id="anchorName"
                name="lastCustomerName"
                type="text"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          ) : null}
          <div>
            <label
              htmlFor="anchorTx"
              className="mb-1 block text-xs font-medium text-emerald-900 text-emerald-200"
            >
              Order / transaction id
            </label>
            <input
              id="anchorTx"
              name="lastTransactionId"
              type="text"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-sm text-zinc-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <SubmitAnchorsButton />
        </form>
      )}

      {jobState !== 'running' && !hasAnchor && (
        <p className="mt-2 text-xs text-amber-800 text-amber-300">
          This job ended before anchors were submitted (or it was cancelled).
        </p>
      )}

      {state && !state.ok && (
        <p className="mt-2 text-sm text-red-400">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p className="mt-2 text-sm text-emerald-300">
          Anchors saved — the bot should continue shortly.
        </p>
      )}
    </div>
  );
}
