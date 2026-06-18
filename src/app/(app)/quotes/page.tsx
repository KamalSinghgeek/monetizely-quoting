import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonClasses, Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import { formatUsd } from '@/lib/pricing/money';
import { termLabel } from '@/lib/labels';
import { formatDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Quotes' };

export default async function QuotesPage() {
  const quotes = await prisma.quote.findMany({ orderBy: { createdAt: 'desc' } });

  return (
    <div>
      <PageHeader
        title="Quotes"
        description="Saved quotes are read-only. Share the link with your customer."
        actions={
          <Link href="/quotes/new" className={buttonClasses('primary')}>
            New quote
          </Link>
        }
      />

      {quotes.length === 0 ? (
        <EmptyState title="No quotes yet">
          <Link href="/quotes/new" className="font-medium text-slate-900 underline">
            Build your first quote
          </Link>
          .
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-slate-100">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/q/${q.shareToken}`} className="font-medium text-slate-900 hover:underline">
                      {q.name}
                    </Link>
                    <p className="truncate text-sm text-slate-500">
                      {q.customerName} · {q.productName} {q.tierName} · {termLabel(q.term)} · {q.seats} seats
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="font-semibold tabular-nums text-slate-900">{formatUsd(q.totalCents)}</span>
                    <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(q.createdAt)}</span>
                    <Link href={`/q/${q.shareToken}`} className={buttonClasses('secondary', 'sm')}>
                      View
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
