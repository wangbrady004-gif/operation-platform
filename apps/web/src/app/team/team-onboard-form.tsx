'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/lib/toast';
import { createOpsUser, type CreateOpsUserResult } from './actions';

const ROLES = [
  { id: 'operator', label: 'Operator', description: 'Run sessions, view logs.' },
  { id: 'viewer',   label: 'Viewer',   description: 'Read-only dashboards.' },
  { id: 'admin',    label: 'Admin',    description: 'Full access + team mgmt.' },
] as const;

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-45"
    >
      {pending ? 'Creating…' : 'Create teammate'}
    </button>
  );
}

export function TeamOnboardForm({
  actorEmail,
  onCreated,
}: {
  actorEmail: string;
  onCreated?: () => void;
}) {
  const [state, action] = useActionState(createOpsUser, null as CreateOpsUserResult | null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!state) return;
    if (state.ok === true) {
      onCreated?.();
      toast.success('Teammate provisioned', {
        id: 'team-onboard-success',
        description: `They can sign in with ${state.email}.`,
        duration: 6000,
      });
      return;
    }
    toast.error('Provisioning failed', {
      id: 'team-onboard-error',
      description: state.message,
    });
  }, [state, onCreated]);

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900">
      <div className="flex items-center gap-2.5 border-b border-zinc-800 px-5 py-4">
        <UserPlus className="h-4 w-4 text-emerald-500" aria-hidden />
        <h2 className="text-sm font-medium text-zinc-200">Add a teammate</h2>
      </div>

      <div className="p-5">
        <p className="mb-1 text-xs text-zinc-600">
          Creating as <span className="font-medium text-zinc-400">{actorEmail}</span> — audit-logged.
        </p>

        <form action={action} className="mt-5 flex flex-col gap-4">
          <div>
            <label htmlFor="newEmail" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Email
            </label>
            <input
              id="newEmail"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="jamie@yourcompany.com"
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Initial password
            </label>
            <div className="relative mt-1.5">
              <input
                id="newPassword"
                name="password"
                type={showPass ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Min 8 characters"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 pr-9 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Role</legend>
            <div className="flex flex-col gap-2 pt-1">
              {ROLES.map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-700 px-3 py-2.5 transition has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-950/40"
                >
                  <input type="radio" name="role" value={r.id} required defaultChecked={r.id === 'operator'} className="mt-0.5 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium text-zinc-200">{r.label}</span>
                    <span className="block text-xs text-zinc-500">{r.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <SubmitBtn />
        </form>

        {state?.ok === false && (
          <p className="mt-4 text-sm text-red-400">{state.message}</p>
        )}

        {state?.ok === true && (
          <div className="mt-4 rounded-xl border border-emerald-900 bg-emerald-950/50 px-4 py-3">
            <p className="text-sm font-medium text-emerald-100">
              Account ready — <span className="font-mono">{state.email}</span>
            </p>
            <p className="mt-1.5 text-xs text-emerald-300/80">
              Send them the{' '}
              <Link href="/access" className="font-medium underline underline-offset-2">
                workspace URL
              </Link>{' '}
              and temporary password via a secure channel.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
