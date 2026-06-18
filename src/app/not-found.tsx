import Link from 'next/link';
import { buttonClasses } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-2 text-slate-500">
          This page or quote doesn&apos;t exist, or the link may be incorrect.
        </p>
        <Link href="/" className={buttonClasses('primary', 'md', 'mt-6')}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
