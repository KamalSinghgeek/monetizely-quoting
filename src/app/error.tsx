'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

// Error boundaries must be Client Components. Next 16.2 passes `unstable_retry`
// (re-renders AND re-fetches the segment); `reset` remains as a fallback.
export default function Error({
  error,
  reset,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  unstable_retry?: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mt-2 text-slate-500">An unexpected error occurred. Please try again.</p>
        <Button onClick={() => (unstable_retry ?? reset)()} className="mt-6">
          Try again
        </Button>
      </div>
    </div>
  );
}
