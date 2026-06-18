import Link from 'next/link';
import { ProductForm } from '@/components/catalog-forms';
import { Card, CardContent, PageHeader } from '@/components/ui';

export const metadata = { title: 'New product' };

export default function NewProductPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="New product" description="Give the product a name. You'll add tiers and features next." />
      <Card>
        <CardContent>
          <ProductForm />
        </CardContent>
      </Card>
      <p className="mt-4 text-sm text-slate-500">
        <Link href="/catalog" className="hover:underline">
          ← Back to catalog
        </Link>
      </p>
    </div>
  );
}
