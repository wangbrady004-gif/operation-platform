import { SessionForm } from './session-form';

export const metadata = {
  title: 'Sign in · Ops Console',
};

export default function AccessPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-zinc-950 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-zinc-50">Ops Console</h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            Sign in with your provisioned account.
          </p>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <SessionForm />
        </div>
      </div>
    </div>
  );
}
