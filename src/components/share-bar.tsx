'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';

/** Copy-link + print controls for the public quote page (hidden when printing). */
export function ShareBar() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="no-print flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={copy}>
        {copied ? 'Link copied ✓' : 'Copy link'}
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        Print
      </Button>
    </div>
  );
}
