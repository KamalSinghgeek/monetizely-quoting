import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonClasses, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from '@/components/ui';
import { formatUsd } from '@/lib/pricing/money';
import { termLabel } from '@/lib/labels';
import { formatDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [products, quotes] = await Promise.all([
    prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { tiers: true, features: true } } },
    }),
    prisma.quote.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Set up a pricing catalog, then build a shareable quote for a customer."
        actions={
          <>
            <Link href="/catalog/new" className={buttonClasses('secondary')}>
              New product
            </Link>
            <Link href="/quotes/new" className={buttonClasses('primary')}>
              New quote
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Products</CardTitle>
            <Link href="/catalog" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <EmptyState title="No products yet">
                <Link href="/catalog/new" className="font-medium text-slate-900 underline">
                  Create your first product
                </Link>{' '}
                to define tiers, features, and add-on pricing.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {products.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/catalog/${p.id}`} className="font-medium text-slate-900 hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {p._count.tiers} tier{p._count.tiers === 1 ? '' : 's'} · {p._count.features} feature
                        {p._count.features === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Link href={`/catalog/${p.id}/matrix`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
                      Edit pricing →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent quotes</CardTitle>
            <Link href="/quotes" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              View all →
            </Link>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <EmptyState title="No quotes yet">Build a quote once you have a product with at least one tier.</EmptyState>
            ) : (
              <ul className="divide-y divide-slate-100">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center justify-between py-3">
                    <div>
                      <Link href={`/q/${q.shareToken}`} className="font-medium text-slate-900 hover:underline">
                        {q.name}
                      </Link>
                      <p className="text-sm text-slate-500">
                        {q.customerName} · {q.productName} {q.tierName} · {termLabel(q.term)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums text-slate-900">{formatUsd(q.totalCents)}</p>
                      <p className="text-xs text-slate-400">{formatDate(q.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
