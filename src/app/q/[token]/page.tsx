import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { QuoteBreakdown } from '@/components/quote-breakdown';
import { ShareBar } from '@/components/share-bar';
import { formatDate } from '@/lib/dates';
import { termDescription } from '@/lib/labels';

export const dynamic = 'force-dynamic';

async function getQuote(token: string) {
  return prisma.quote.findUnique({
    where: { shareToken: token },
    include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuote(token);
  if (!quote) return { title: 'Quote not found' };
  return {
    title: quote.name,
    description: `Quote for ${quote.customerName}`,
    robots: { index: false }, // shareable but not indexable
  };
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-right text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuote(token);
  if (!quote) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-900 text-sm font-semibold text-white">
              M
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quote</span>
          </div>
          <ShareBar />
        </div>

        <div className="px-6 py-6 sm:px-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{quote.name}</h1>
          <p className="mt-1 text-slate-500">Prepared for {quote.customerName}</p>

          {/* Meta */}
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Quote details</h2>
              <dl className="divide-y divide-slate-100">
                <MetaRow label="Customer" value={quote.customerName} />
                <MetaRow label="Quote date" value={formatDate(quote.quoteDate)} />
                <MetaRow label="Valid until" value={formatDate(quote.validUntil)} />
              </dl>
            </section>
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                What is being purchased
              </h2>
              <dl className="divide-y divide-slate-100">
                <MetaRow label="Product" value={quote.productName} />
                <MetaRow label="Tier" value={quote.tierName} />
                <MetaRow label="Seats" value={String(quote.seats)} />
                <MetaRow label="Term length" value={termDescription(quote.term)} />
              </dl>
            </section>
          </div>

          {/* Cost breakdown */}
          <div className="mt-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Cost breakdown</h2>
            <QuoteBreakdown
              lineItems={quote.lineItems}
              subtotalCents={quote.subtotalCents}
              discountCents={quote.discountCents}
              totalCents={quote.totalCents}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        This quote is valid until {formatDate(quote.validUntil)}. Prices in USD, exclusive of tax.
      </p>
    </div>
  );
}
