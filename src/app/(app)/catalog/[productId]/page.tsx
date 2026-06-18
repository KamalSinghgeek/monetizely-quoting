import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import {
  AddFeatureForm,
  AddTierForm,
  EditableFeatureRow,
  EditableTierRow,
  EditProductForm,
} from '@/components/catalog-forms';
import { buttonClasses, Card, CardContent, CardHeader, CardTitle, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { name: true } });
  return { title: product?.name ?? 'Product' };
}

export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      tiers: { orderBy: { sortOrder: 'asc' } },
      features: { orderBy: { sortOrder: 'asc' } },
    },
  });
  if (!product) notFound();

  const canEditMatrix = product.tiers.length > 0 && product.features.length > 0;

  return (
    <div>
      <PageHeader
        title={product.name}
        description="Edit product details, tiers, and features, then set add-on pricing in the matrix."
        actions={
          <Link
            href={`/catalog/${product.id}/matrix`}
            aria-disabled={!canEditMatrix}
            className={buttonClasses('primary', 'md', canEditMatrix ? '' : 'pointer-events-none opacity-50')}
          >
            Edit pricing matrix
          </Link>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Product details</CardTitle>
          </CardHeader>
          <CardContent>
            <EditProductForm productId={product.id} name={product.name} notes={product.notes} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.tiers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No tiers yet. Add at least one (e.g. Starter, Growth, Enterprise).
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {product.tiers.map((t) => (
                    <li key={t.id}>
                      <EditableTierRow
                        productId={product.id}
                        tier={{ id: t.id, name: t.name, basePriceCents: t.basePriceCents }}
                      />
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 pt-4">
                <AddTierForm productId={product.id} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.features.length === 0 ? (
                <p className="text-sm text-slate-500">No features yet. Add the capabilities this product offers.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {product.features.map((f) => (
                    <li key={f.id}>
                      <EditableFeatureRow productId={product.id} feature={{ id: f.id, name: f.name }} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t border-slate-100 pt-4">
                <AddFeatureForm productId={product.id} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {!canEditMatrix ? (
        <p className="mt-6 text-sm text-slate-500">
          Add at least one tier and one feature to set up the add-on pricing matrix.
        </p>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Next:{' '}
          <Link href={`/catalog/${product.id}/matrix`} className="font-medium text-slate-900 underline">
            set each feature&apos;s availability and add-on pricing per tier
          </Link>
          .
        </p>
      )}
    </div>
  );
}
