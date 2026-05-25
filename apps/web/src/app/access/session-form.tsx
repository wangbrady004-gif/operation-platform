'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const inputCls =
  'mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20';

export function SessionForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        const msg = data.message ?? `Authentication failed (${res.status})`;
        setError(msg);
        toast.error('Sign in failed', { id: 'login', description: msg });
        return;
      }
      toast.success('Welcome back', { id: 'login-success', duration: 2000 });
      const next =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('next') || '/merchant-run'
          : '/merchant-run';
      router.replace(next.startsWith('/') ? next : '/merchant-run');
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg);
      toast.error('Sign in failed', { id: 'login', description: msg });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-xs font-medium text-zinc-400">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-xs font-medium text-zinc-400">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className={inputCls}
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
