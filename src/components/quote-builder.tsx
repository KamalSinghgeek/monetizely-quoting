'use client';

import { useMemo, useState, useTransition } from 'react';
import { createQuote } from '@/lib/actions/quotes';
import { computeQuote } from '@/lib/pricing/engine';
import type { AddonPricingModel, SelectedAddon, TermLength } from '@/lib/pricing/types';
import { formatUsd, percentToBps } from '@/lib/pricing/money';
import { addonPriceLabel, TERM_OPTIONS } from '@/lib/labels';
import { QuoteBreakdown } from '@/components/quote-breakdown';
import { Button, Card, CardContent, CardHeader, CardTitle, Field, Input, Select } from '@/components/ui';
import { cn } from '@/lib/cn';

export type BuilderAddon = {
  tierFeatureId: string;
  featureName: string;
  model: AddonPricingModel;
  value: number; // cents (fixed/per-seat) or basis points (percent)
};
export type BuilderTier = { id: string; name: string; basePriceCents: number; addons: BuilderAddon[] };
export type BuilderProduct = { id: string; name: string; tiers: BuilderTier[] };

const toInt = (s: string) => {
  const n = Math.floor(Number(s));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const toPct = (s: string) => {
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
};

export function QuoteBuilder({ products }: { products: BuilderProduct[] }) {
  const [name, setName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [productId, setProductId] = useState(products[0].id);
  const [tierId, setTierId] = useState(products[0].tiers[0].id);
  const [seats, setSeats] = useState('25');
  const [term, setTerm] = useState<TermLength>('ANNUAL');
  const [discount, setDiscount] = useState('0');
  // selected add-ons: tierFeatureId -> add-on seat count (used only for per-seat add-ons)
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const product = products.find((p) => p.id === productId)!;
  const tier = product.tiers.find((t) => t.id === tierId) ?? product.tiers[0];
  const seatsNum = toInt(seats);
  const discountNum = toPct(discount);

  function onProductChange(id: string) {
    const next = products.find((p) => p.id === id)!;
    setProductId(id);
    setTierId(next.tiers[0].id);
    setSelected({});
    setError(null);
  }
  function onTierChange(id: string) {
    setTierId(id);
    setSelected({}); // add-ons differ per tier
    setError(null);
  }
  function toggleAddon(addon: BuilderAddon) {
    setSelected((prev) => {
      const next = { ...prev };
      if (addon.tierFeatureId in next) {
        delete next[addon.tierFeatureId];
      } else {
        next[addon.tierFeatureId] = seatsNum; // default per-seat count to the product seats
      }
      return next;
    });
  }

  // Live preview uses the SAME engine the server uses on save.
  const previewAddons: SelectedAddon[] = useMemo(
    () =>
      tier.addons
        .filter((a) => a.tierFeatureId in selected)
        .map((a) => ({
          featureName: a.featureName,
          model: a.model,
          value: a.value,
          addonSeats: a.model === 'PER_SEAT' ? selected[a.tierFeatureId] : undefined,
        })),
    [tier.addons, selected],
  );

  const preview = useMemo(
    () =>
      computeQuote({
        productName: product.name,
        tierName: tier.name,
        basePriceCents: tier.basePriceCents,
        seats: seatsNum,
        term,
        addons: previewAddons,
        overallDiscountBps: percentToBps(discountNum),
      }),
    [product.name, tier.name, tier.basePriceCents, seatsNum, term, previewAddons, discountNum],
  );

  function onSave() {
    setError(null);
    if (!name.trim()) return setError('Enter a quote name.');
    if (!customerName.trim()) return setError('Enter a customer name.');

    const payload = {
      name: name.trim(),
      customerName: customerName.trim(),
      productId,
      tierId,
      seats: seatsNum,
      term,
      overallDiscountPercent: discountNum,
      addons: tier.addons
        .filter((a) => a.tierFeatureId in selected)
        .map((a) => ({
          tierFeatureId: a.tierFeatureId,
          addonSeats: a.model === 'PER_SEAT' ? selected[a.tierFeatureId] : undefined,
        })),
    };

    startTransition(async () => {
      const res = await createQuote(payload);
      if (res && !res.ok) setError(res.message);
      // On success the server action redirects to the public quote URL.
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Quote details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Quote name" htmlFor="qname">
              <Input
                id="qname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp - Q3 2026 proposal"
                maxLength={150}
              />
            </Field>
            <Field label="Customer" htmlFor="customer">
              <Input
                id="customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Acme Corporation"
                maxLength={150}
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product &amp; plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product" htmlFor="product">
                <Select id="product" value={productId} onChange={(e) => onProductChange(e.target.value)}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Tier" htmlFor="tier">
                <Select id="tier" value={tierId} onChange={(e) => onTierChange(e.target.value)}>
                  {product.tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {formatUsd(t.basePriceCents)}/seat/mo
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Seats" htmlFor="seats">
              <Input
                id="seats"
                type="number"
                min={0}
                step={1}
                value={seats}
                onChange={(e) => setSeats(e.target.value)}
              />
            </Field>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Term length</span>
              <div className="grid grid-cols-3 gap-2">
                {TERM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTerm(opt.value)}
                    className={cn(
                      'rounded-md border px-3 py-2 text-left transition-colors',
                      term === opt.value
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    <span className="block text-sm font-medium">{opt.label}</span>
                    <span className={cn('block text-xs', term === opt.value ? 'text-slate-300' : 'text-slate-400')}>
                      {opt.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Overall quote discount (%)" htmlFor="discount" hint="Applied to the whole quote. Optional.">
              <Input
                id="discount"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="max-w-32"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add-ons for {tier.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {tier.addons.length === 0 ? (
              <p className="text-sm text-slate-500">No paid add-ons are available on this tier.</p>
            ) : (
              <ul className="space-y-2">
                {tier.addons.map((a) => {
                  const isSelected = a.tierFeatureId in selected;
                  return (
                    <li
                      key={a.tierFeatureId}
                      className={cn(
                        'rounded-lg border p-3 transition-colors',
                        isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200',
                      )}
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleAddon(a)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                        />
                        <span className="flex-1">
                          <span className="font-medium text-slate-900">{a.featureName}</span>
                          <span className="ml-2 text-sm text-slate-500">{addonPriceLabel(a.model, a.value)}</span>
                        </span>
                      </label>
                      {isSelected && a.model === 'PER_SEAT' ? (
                        <div className="mt-3 flex items-center gap-2 pl-7">
                          <label htmlFor={`seats-${a.tierFeatureId}`} className="text-sm text-slate-600">
                            Add-on seats
                          </label>
                          <Input
                            id={`seats-${a.tierFeatureId}`}
                            type="number"
                            min={0}
                            step={1}
                            value={selected[a.tierFeatureId]}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [a.tierFeatureId]: toInt(e.target.value) }))
                            }
                            className="w-24"
                          />
                          <span className="text-xs text-slate-400">independent of the {seatsNum}-seat product</span>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live preview */}
      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-20">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Live preview</CardTitle>
              <span className="text-xs text-slate-400">Updates as you type</span>
            </CardHeader>
            <CardContent>
              <QuoteBreakdown
                lineItems={preview.lineItems}
                subtotalCents={preview.subtotalCents}
                discountCents={preview.discountCents}
                totalCents={preview.totalCents}
              />
            </CardContent>
          </Card>

          {error ? (
            <p role="alert" className="mt-3 text-sm font-medium text-red-600">
              {error}
            </p>
          ) : null}

          <Button onClick={onSave} disabled={pending} className="mt-4 w-full">
            {pending ? 'Saving…' : 'Save quote & get share link'}
          </Button>
        </div>
      </div>
    </div>
  );
}
