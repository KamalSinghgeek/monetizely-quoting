import Link from 'next/link';
import type { ReactNode } from 'react';
import { NavLinks } from '@/components/nav';
import { buttonClasses } from '@/components/ui';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-slate-900 text-sm text-white">M</span>
              Monetizely
            </Link>
            <NavLinks />
          </div>
          <Link href="/quotes/new" className={buttonClasses('primary', 'sm')}>
            New quote
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Monetizely quoting tool — USD, no tax. Quotes are read-only once saved.
      </footer>
    </>
  );
}
