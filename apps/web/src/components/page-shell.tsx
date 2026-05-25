import { Sidebar } from './sidebar';

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="lg:pl-56">
        <div className="h-14 lg:hidden" aria-hidden />
        <main className="px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
