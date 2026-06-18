import Link from 'next/link';
import { prisma } from '@/lib/db';
import { buttonClasses, Card, CardContent, EmptyState, PageHeader } from '@/components/ui';
import { formatUsd } from '@/lib/pricing/money';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Catalog' };

export default async function CatalogPage() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      tiers: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { features: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products, their tiers, features, and add-on pricing."
        actions={
          <Link href="/catalog/new" className={buttonClasses('primary')}>
            New product
          </Link>
        }
      />

      {products.length === 0 ? (
        <EmptyState title="No products yet">
          <Link href="/catalog/new" className="font-medium text-slate-900 underline">
            Create a product
          </Link>{' '}
          to get started.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/catalog/${p.id}`} className="text-lg font-semibold text-slate-900 hover:underline">
                      {p.name}
                    </Link>
                    {p.notes ? <p className="mt-1 text-sm text-slate-500">{p.notes}</p> : null}
                  </div>
                  <Link href={`/catalog/${p.id}/matrix`} className={buttonClasses('secondary', 'sm')}>
                    Pricing matrix
                  </Link>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.tiers.length === 0 ? (
                    <span className="text-sm text-slate-400">No tiers yet</span>
                  ) : (
                    p.tiers.map((t) => (
                      <span
                        key={t.id}
                        className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 tabular-nums"
                      >
                        {t.name} · {formatUsd(t.basePriceCents)}/seat/mo
                      </span>
                    ))
                  )}
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  {p._count.features} feature{p._count.features === 1 ? '' : 's'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
