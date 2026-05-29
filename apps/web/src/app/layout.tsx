import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppToaster } from '@/components/app-toaster';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'Ops Console', template: '%s · Ops Console' },
  description: 'Internal operations console for bank automation.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark min-h-full bg-zinc-950">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full antialiased bg-zinc-950 text-zinc-50`}>
        {children}
        <AppToaster />
      </body>
    </html>
  );
}
