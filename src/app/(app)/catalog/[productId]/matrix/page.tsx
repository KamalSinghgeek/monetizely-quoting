import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { MatrixEditor, type MatrixData } from '@/components/matrix-editor';
import { PageHeader } from '@/components/ui';
import { bpsToPercent, centsToDollars } from '@/lib/pricing/money';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  return { title: `${product?.name ?? 'Product'} — pricing matrix` };
}

export default async function MatrixPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tiers: { orderBy: { sortOrder: 'asc' }, include: { tierFeatures: true } },
      features: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!product) notFound();
  if (product.tiers.length === 0 || product.features.length === 0) {
    return (
      <div>
        <PageHeader title={`${product.name} — pricing matrix`} />
        <p className="text-sm text-slate-500">
          Add at least one tier and one feature first.{' '}
          <Link href={`/catalog/${product.id}`} className="font-medium text-slate-900 underline">
            Go back
          </Link>
          .
        </p>
      </div>
    );
  }

  // Shape the initial cell state, converting stored values into the analyst's units.
  const cells: MatrixData['cells'] = {};
  for (const tier of product.tiers) {
    for (const tf of tier.tierFeatures) {
      const isPercent = tf.addonModel === 'PERCENT_OF_PRODUCT';
      cells[`${tf.tierId}:${tf.featureId}`] = {
        availability: tf.availability,
        addonModel: tf.addonModel ?? null,
        addonValue:
          tf.addonValue == null ? null : isPercent ? bpsToPercent(tf.addonValue) : centsToDollars(tf.addonValue),
      };
    }
  }

  const data: MatrixData = {
    productId: product.id,
    tiers: product.tiers.map((t) => ({ id: t.id, name: t.name, basePriceCents: t.basePriceCents })),
    features: product.features.map((f) => ({ id: f.id, name: f.name })),
    cells,
  };

  return (
    <div>
      <PageHeader
        title={`${product.name} — pricing matrix`}
        description="For each feature and tier, choose Included, Add-on, or Not available. Add-ons need a pricing model and value."
        actions={
          <Link href={`/catalog/${product.id}`} className="text-sm font-medium text-slate-600 hover:text-slate-900">
            ← Product
          </Link>
        }
      />
      <MatrixEditor data={data} />
    </div>
  );
}
