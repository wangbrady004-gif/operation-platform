'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Eye, Loader2, Pencil, Terminal, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { toast } from '@/lib/toast';
import { deleteBank } from './actions';
import { BankGenerateModal } from './bank-generate-modal';

const subtleBtn =
  'inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors sm:min-w-0 sm:px-4';

export function BankAdminActions({
  id,
  profileKey,
  deleteRedirectHref = '/banks',
  showEditLink = true,
  showViewLink = true,
  showGenerateLink = true,
  editHref,
}: {
  id: string;
  profileKey: string;
  deleteRedirectHref?: string;
  showEditLink?: boolean;
  showViewLink?: boolean;
  showGenerateLink?: boolean;
  /** Override default registry deep link `/banks?open=:id&edit=1`. */
  editHref?: string;
}) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [showGenerate, setShowGenerate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  function confirmDelete() {
    start(async () => {
      const r = await deleteBank(id);
      if (r.ok) {
        setShowDeleteConfirm(false);
        toast.success('Bank profile removed', {
          id: `delete-bank-${id}`,
          description: profileKey,
        });
        router.replace(deleteRedirectHref);
        router.refresh();
      } else {
        toast.error('Could not delete bank profile', {
          id: `delete-bank-error-${id}`,
          description: r.message,
        });
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showGenerateLink ? (
          <button
            type="button"
            aria-label="Generate EXE"
            title="Generate EXE"
            onClick={() => setShowGenerate(true)}
            className={`${subtleBtn} border-violet-800/60 bg-violet-950/40 text-violet-300 hover:bg-violet-950`}
          >
            <Terminal className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </button>
        ) : null}
        {showEditLink ? (
          <Link
            href={editHref ?? `/banks?open=${encodeURIComponent(id)}&edit=1`}
            aria-label="Edit bank profile"
            title="Edit"
            className={`${subtleBtn} border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700`}
          >
            <Pencil className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </Link>
        ) : null}
        {showViewLink ? (
          <Link
            href={`/banks?open=${encodeURIComponent(id)}`}
            aria-label="View bank profile details"
            title="View"
            className={`${subtleBtn} border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700`}
          >
            <Eye className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          </Link>
        ) : null}
        <button
          type="button"
          disabled={busy}
          aria-label={busy ? 'Deleting bank profile' : 'Delete bank profile'}
          title={busy ? 'Deleting…' : 'Delete'}
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-red-900/70 bg-red-950/50 px-3 text-sm font-medium text-red-100 transition-colors hover:bg-red-950 disabled:opacity-50 sm:min-w-0 sm:px-4"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          )}
        </button>
      </div>

      {showGenerate && (
        <BankGenerateModal
          key={id}
          id={id}
          profileKey={profileKey}
          onClose={() => setShowGenerate(false)}
        />
      )}

      <ConfirmDialog
        open={showDeleteConfirm}
        variant="danger"
        title="Delete bank profile?"
        description={`Remove «${profileKey}» from the directory. This cannot be undone. Historical tasks may still reference this profile id.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        busy={busy}
        onClose={() => !busy && setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
