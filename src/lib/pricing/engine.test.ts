import { describe, expect, it } from 'vitest';
import { computeQuote } from './engine';
import type { PricingInput } from './types';

/** The Growth tier of the reference catalog: $50 per seat per month. */
const GROWTH_BASE = 5000;

describe('computeQuote — reference sample (docs/reference/sample-quote.xlsx)', () => {
  // Acme Corp - Q3 2026: Analytics Suite, Growth, 25 seats, Annual,
  // + SSO (fixed $200/mo) + API access (per-seat $50/mo for 5 seats). Total $18,150.
  const result = computeQuote({
    productName: 'Analytics Suite',
    tierName: 'Growth',
    basePriceCents: GROWTH_BASE,
    seats: 25,
    term: 'ANNUAL',
    addons: [
      { featureName: 'Single Sign-On (SSO)', model: 'FIXED_MONTHLY', value: 20000 },
      { featureName: 'API access', model: 'PER_SEAT', value: 5000, addonSeats: 5 },
    ],
  });

  it('produces the base product line with the exact derivation', () => {
    expect(result.lineItems[0]).toEqual({
      kind: 'BASE',
      label: 'Analytics Suite - Growth tier',
      explanation: '25 seats × $50 per seat per month × 12 months × (1 - 15% annual discount)',
      notes: 'Base product cost',
      amountCents: 1_275_000, // $12,750.00
    });
  });

  it('produces the fixed-monthly add-on line', () => {
    expect(result.lineItems[1]).toEqual({
      kind: 'ADDON',
      label: 'Add-on: Single Sign-On (SSO)',
      explanation: '$200 per month × 12 months',
      notes: 'Fixed monthly add-on',
      amountCents: 240_000, // $2,400.00
    });
  });

  it('produces the per-seat add-on line with an independent seat count', () => {
    expect(result.lineItems[2]).toEqual({
      kind: 'ADDON',
      label: 'Add-on: API access',
      explanation: '5 seats × $50 per seat per month × 12 months',
      notes: 'Per-seat add-on (seat count independent of product seats)',
      amountCents: 300_000, // $3,000.00 — 5 add-on seats, not the 25 product seats
    });
  });

  it('totals to $18,150.00 with no overall discount', () => {
    expect(result.subtotalCents).toBe(1_815_000);
    expect(result.discountCents).toBe(0);
    expect(result.totalCents).toBe(1_815_000);
    expect(result.lineItems).toHaveLength(3);
  });
});

describe('computeQuote — term length discounts (apply only to the base line)', () => {
  const base = (term: PricingInput['term']) =>
    computeQuote({
      productName: 'Analytics Suite',
      tierName: 'Growth',
      basePriceCents: GROWTH_BASE,
      seats: 25,
      term,
      addons: [],
    });

  it('monthly = 1 month, 0% discount, and omits the discount clause', () => {
    const r = base('MONTHLY');
    expect(r.termMonths).toBe(1);
    expect(r.termDiscountBps).toBe(0);
    expect(r.lineItems[0].amountCents).toBe(125_000); // 25 × $50 × 1
    expect(r.lineItems[0].explanation).toBe('25 seats × $50 per seat per month × 1 month');
  });

  it('annual = 12 months, 15% off the per-seat price', () => {
    const r = base('ANNUAL');
    expect(r.termMonths).toBe(12);
    expect(r.termDiscountBps).toBe(1500);
    expect(r.lineItems[0].amountCents).toBe(1_275_000); // 25 × $50 × 12 × 0.85
  });

  it('two-year = 24 months, 25% off the per-seat price', () => {
    const r = base('TWO_YEAR');
    expect(r.termMonths).toBe(24);
    expect(r.termDiscountBps).toBe(2500);
    expect(r.lineItems[0].amountCents).toBe(2_250_000); // 25 × $50 × 24 × 0.75
  });
});

describe('computeQuote — fixed-monthly add-on is never term-discounted', () => {
  const withFixedAddon = (term: PricingInput['term']) =>
    computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 10,
      term,
      addons: [{ featureName: 'SSO', model: 'FIXED_MONTHLY', value: 20000 }],
    }).lineItems[1].amountCents;

  it('is value × months regardless of term', () => {
    expect(withFixedAddon('MONTHLY')).toBe(20_000); // $200 × 1
    expect(withFixedAddon('ANNUAL')).toBe(240_000); // $200 × 12 (NOT × 0.85)
    expect(withFixedAddon('TWO_YEAR')).toBe(480_000); // $200 × 24 (NOT × 0.75)
  });
});

describe('computeQuote — per-seat add-on (independent seats, never term-discounted)', () => {
  it('uses the add-on seat count, not the product seat count, and ignores the term discount', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 25, // product seats
      term: 'ANNUAL', // 15% discount applies to the base only
      addons: [{ featureName: 'API access', model: 'PER_SEAT', value: 5000, addonSeats: 5 }],
    });
    expect(r.lineItems[1].amountCents).toBe(300_000); // 5 × $50 × 12, no 0.85 factor
  });
});

describe('computeQuote — percent-of-product add-on (uses the discounted base line)', () => {
  it('takes the percentage of the base product line as displayed', () => {
    const r = computeQuote({
      productName: 'Analytics Suite',
      tierName: 'Growth',
      basePriceCents: GROWTH_BASE,
      seats: 25,
      term: 'ANNUAL', // base line = $12,750.00
      addons: [{ featureName: 'Advanced anomaly detection', model: 'PERCENT_OF_PRODUCT', value: 1000 }], // 10%
    });
    const baseCents = r.lineItems[0].amountCents;
    expect(baseCents).toBe(1_275_000);
    expect(r.lineItems[1]).toEqual({
      kind: 'ADDON',
      label: 'Add-on: Advanced anomaly detection',
      explanation: '10% of base product cost ($12,750)',
      notes: 'Percentage of the product cost',
      amountCents: 127_500, // 10% of $12,750
    });
  });

  it('handles the Enterprise 5% custom-integrations example', () => {
    const r = computeQuote({
      productName: 'Analytics Suite',
      tierName: 'Enterprise',
      basePriceCents: 10000, // $100/seat
      seats: 10,
      term: 'MONTHLY', // base = 10 × $100 × 1 = $1,000
      addons: [{ featureName: 'Custom integrations', model: 'PERCENT_OF_PRODUCT', value: 500 }], // 5%
    });
    expect(r.lineItems[0].amountCents).toBe(100_000); // $1,000
    expect(r.lineItems[1].amountCents).toBe(5_000); // 5% of $1,000 = $50
  });
});

describe('computeQuote — overall quote discount', () => {
  it('emits its own negative line and reconciles the total', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 25,
      term: 'ANNUAL',
      addons: [{ featureName: 'SSO', model: 'FIXED_MONTHLY', value: 20000 }],
      overallDiscountBps: 1000, // 10%
    });
    // subtotal = base 1,275,000 + SSO 240,000 = 1,515,000
    expect(r.subtotalCents).toBe(1_515_000);
    const discountLine = r.lineItems[r.lineItems.length - 1];
    expect(discountLine).toEqual({
      kind: 'DISCOUNT',
      label: 'Quote discount (10%)',
      explanation: '10% × $15,150 subtotal',
      notes: 'Applied to the full subtotal',
      amountCents: -151_500, // -10% of $15,150
    });
    expect(r.discountCents).toBe(151_500);
    expect(r.totalCents).toBe(1_363_500); // 1,515,000 - 151,500
  });
});

describe('computeQuote — all three add-on models plus an overall discount', () => {
  it('composes correctly', () => {
    const r = computeQuote({
      productName: 'Analytics Suite',
      tierName: 'Growth',
      basePriceCents: GROWTH_BASE,
      seats: 25,
      term: 'ANNUAL',
      addons: [
        { featureName: 'SSO', model: 'FIXED_MONTHLY', value: 20000 }, // $2,400
        { featureName: 'API access', model: 'PER_SEAT', value: 5000, addonSeats: 5 }, // $3,000
        { featureName: 'Anomaly detection', model: 'PERCENT_OF_PRODUCT', value: 1000 }, // 10% of $12,750 = $1,275
      ],
      overallDiscountBps: 500, // 5%
    });
    // base 1,275,000 + 240,000 + 300,000 + 127,500 = 1,942,500
    expect(r.subtotalCents).toBe(1_942_500);
    expect(r.discountCents).toBe(97_125); // 5% of 1,942,500
    expect(r.totalCents).toBe(1_845_375);
    expect(r.lineItems).toHaveLength(5); // base + 3 add-ons + discount
  });
});

describe('computeQuote — edge cases', () => {
  it('handles zero seats', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 0,
      term: 'MONTHLY',
      addons: [],
    });
    expect(r.totalCents).toBe(0);
    expect(r.lineItems[0].explanation).toBe('0 seats × $50 per seat per month × 1 month');
  });

  it('handles a 100% overall discount (total goes to zero)', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 10,
      term: 'MONTHLY',
      addons: [],
      overallDiscountBps: 10000, // 100%
    });
    expect(r.subtotalCents).toBe(50_000);
    expect(r.discountCents).toBe(50_000);
    expect(r.totalCents).toBe(0);
  });

  it('pluralizes a single seat and single month', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 1,
      term: 'MONTHLY',
      addons: [{ featureName: 'API', model: 'PER_SEAT', value: 5000, addonSeats: 1 }],
    });
    expect(r.lineItems[0].explanation).toBe('1 seat × $50 per seat per month × 1 month');
    expect(r.lineItems[1].explanation).toBe('1 seat × $50 per seat per month × 1 month');
  });

  it('does not add a discount line when the overall discount is zero', () => {
    const r = computeQuote({
      productName: 'P',
      tierName: 'T',
      basePriceCents: GROWTH_BASE,
      seats: 10,
      term: 'MONTHLY',
      addons: [],
      overallDiscountBps: 0,
    });
    expect(r.lineItems.every((li) => li.kind !== 'DISCOUNT')).toBe(true);
  });
});
