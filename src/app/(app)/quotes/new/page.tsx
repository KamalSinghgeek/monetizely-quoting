import Link from 'next/link';
import { prisma } from '@/lib/db';
import { QuoteBuilder, type BuilderProduct } from '@/components/quote-builder';
import { EmptyState, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'New quote' };

export default async function NewQuotePage() {
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      tiers: {
        orderBy: { sortOrder: 'asc' },
        include: {
          tierFeatures: {
            where: { availability: 'ADDON' },
            include: { feature: true },
          },
        },
      },
    },
  });

  // Only products that have at least one tier can be quoted.
  const builderProducts: BuilderProduct[] = products
    .filter((p) => p.tiers.length > 0)
    .map((p) => ({
      id: p.id,
      name: p.name,
      tiers: p.tiers.map((t) => ({
        id: t.id,
        name: t.name,
        basePriceCents: t.basePriceCents,
        addons: t.tierFeatures
          .filter((tf) => tf.addonModel != null && tf.addonValue != null)
          .map((tf) => ({
            tierFeatureId: tf.id,
            featureName: tf.feature.name,
            model: tf.addonModel as BuilderProduct['tiers'][number]['addons'][number]['model'],
            value: tf.addonValue as number,
          })),
      })),
    }));

  return (
    <div>
      <PageHeader title="New quote" description="Build a quote and save it to get a shareable link." />
      {builderProducts.length === 0 ? (
        <EmptyState title="No quotable products yet">
          Add a product with at least one tier in the{' '}
          <Link href="/catalog" className="font-medium text-slate-900 underline">
            catalog
          </Link>{' '}
          first.
        </EmptyState>
      ) : (
        <QuoteBuilder products={builderProducts} />
      )}
    </div>
  );
}
