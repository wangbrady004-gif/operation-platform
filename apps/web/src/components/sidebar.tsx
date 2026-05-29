'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Play,
  Store,
  Users,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { toast } from '@/lib/toast';

const MAIN_NAV = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/bank-run', label: 'Run Session', icon: Play, exact: false },
];

const ADMIN_NAV = [
  { href: '/banks', label: 'Directory', icon: Store, exact: false },
  { href: '/team', label: 'Team', icon: Users, exact: false },
];

// const TOOLS_NAV = [
//   { href: '/generate-exe', label: 'Generate EXE', icon: Package, exact: false },
//   { href: '/generate-launcher', label: 'Launcher', icon: Rocket, exact: false },
// ];
const TOOLS_NAV: { href: string; label: string; icon: React.ElementType; exact: boolean }[] = [];

type NavItem = { href: string; label: string; icon: React.ElementType; exact: boolean };

function NavSection({
  items,
  label,
  pathname,
  onNav,
}: {
  items: NavItem[];
  label?: string;
  pathname: string;
  onNav?: () => void;
}) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNav}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-zinc-800 font-medium text-zinc-50'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
            )}
          >
            <item.icon
              size={15}
              className={active ? 'text-emerald-400' : ''}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        toast.error('Logout failed', { id: 'logout' });
        return;
      }
      toast.success('Signed out', { id: 'logout', duration: 2000 });
      router.replace('/access');
      router.refresh();
    } catch (e) {
      toast.error('Logout failed', {
        id: 'logout',
        description: e instanceof Error ? e.message : 'Network error',
      });
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-zinc-800 px-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
          <Zap size={14} strokeWidth={2.5} aria-hidden />
        </span>
        <span className="text-sm font-semibold text-zinc-100">Ops Console</span>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <NavSection items={MAIN_NAV} pathname={pathname} onNav={onNav} />
        <NavSection items={ADMIN_NAV} label="Admin" pathname={pathname} onNav={onNav} />
        {TOOLS_NAV.length > 0 && <NavSection items={TOOLS_NAV} label="Tools" pathname={pathname} onNav={onNav} />}
      </nav>

      <div className="shrink-0 border-t border-zinc-800 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-300"
        >
          <LogOut size={15} aria-hidden />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-56 lg:flex-col border-r border-zinc-800 bg-zinc-950">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-zinc-950">
            <Zap size={14} strokeWidth={2.5} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-zinc-100">Ops Console</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          aria-label="Open menu"
        >
          <Menu size={18} aria-hidden />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/70"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside className="lg:hidden fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
            <div className="absolute right-3 top-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-900"
                aria-label="Close menu"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <SidebarContent onNav={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
