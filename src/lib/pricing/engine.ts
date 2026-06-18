/**
 * Pricing engine — the single source of truth for quote math.
 *
 * Pure function, no I/O. `computeQuote` takes the resolved inputs (base price, seats,
 * term, selected add-ons, optional overall discount) and returns the line items with
 * their human-readable derivations plus the subtotal/discount/total. Each amount and
 * its explanation string are built from one set of inputs, so they cannot disagree.
 *
 * Pricing rules (verified against docs/reference/sample-quote.xlsx):
 *  - Base product line: seats × basePrice × months × (1 − termDiscount).
 *    The term discount applies ONLY to this line.
 *  - Fixed-monthly add-on:   value × months                      (no term discount)
 *  - Per-seat add-on:        addonSeats × value × months         (no term discount; seats independent)
 *  - % -of-product add-on:   value% × the base product line       (the discounted line, as displayed)
 *  - Overall quote discount: its own negative line; total = subtotal − discount.
 */

import { applyBps, formatPct, formatUsd } from './money';
import type { LineItem, PricingInput, PricingResult, SelectedAddon } from './types';
import { TERMS } from './types';

const pluralize = (n: number, singular: string) => `${n} ${singular}${n === 1 ? '' : 's'}`;

export function computeQuote(input: PricingInput): PricingResult {
  const { productName, tierName, basePriceCents, seats, term, addons } = input;
  const overallDiscountBps = input.overallDiscountBps ?? 0;
  const { months, discountBps: termDiscountBps, label: termLabel } = TERMS[term];

  const lineItems: LineItem[] = [];

  // --- Base product line (term discount applies only here) ---
  const baseUndiscounted = seats * basePriceCents * months;
  const baseCents = applyBps(baseUndiscounted, 10000 - termDiscountBps);

  let baseExplanation =
    `${pluralize(seats, 'seat')} × ${formatUsd(basePriceCents)} per seat per month × ${pluralize(months, 'month')}`;
  if (termDiscountBps > 0) {
    baseExplanation += ` × (1 - ${formatPct(termDiscountBps)} ${termLabel.toLowerCase()} discount)`;
  }
  lineItems.push({
    kind: 'BASE',
    label: `${productName} - ${tierName} tier`,
    explanation: baseExplanation,
    notes: 'Base product cost',
    amountCents: baseCents,
  });

  // --- Add-on lines (never term-discounted) ---
  for (const addon of addons) {
    lineItems.push(computeAddonLine(addon, months, baseCents));
  }

  // --- Subtotal (base + add-ons, before any overall discount) ---
  const subtotalCents = lineItems.reduce((sum, li) => sum + li.amountCents, 0);

  // --- Overall quote discount (emitted as its own negative line so the math stays visible) ---
  let discountCents = 0;
  if (overallDiscountBps > 0) {
    discountCents = applyBps(subtotalCents, overallDiscountBps);
    lineItems.push({
      kind: 'DISCOUNT',
      label: `Quote discount (${formatPct(overallDiscountBps)})`,
      explanation: `${formatPct(overallDiscountBps)} × ${formatUsd(subtotalCents)} subtotal`,
      notes: 'Applied to the full subtotal',
      amountCents: -discountCents,
    });
  }

  const totalCents = subtotalCents - discountCents;

  return { lineItems, subtotalCents, discountCents, totalCents, termMonths: months, termDiscountBps };
}

function computeAddonLine(addon: SelectedAddon, months: number, baseCents: number): LineItem {
  const label = `Add-on: ${addon.featureName}`;

  switch (addon.model) {
    case 'FIXED_MONTHLY':
      return {
        kind: 'ADDON',
        label,
        explanation: `${formatUsd(addon.value)} per month × ${pluralize(months, 'month')}`,
        notes: 'Fixed monthly add-on',
        amountCents: addon.value * months,
      };

    case 'PER_SEAT': {
      const addonSeats = addon.addonSeats ?? 0;
      return {
        kind: 'ADDON',
        label,
        explanation:
          `${pluralize(addonSeats, 'seat')} × ${formatUsd(addon.value)} per seat per month × ${pluralize(months, 'month')}`,
        notes: 'Per-seat add-on (seat count independent of product seats)',
        amountCents: addonSeats * addon.value * months,
      };
    }

    case 'PERCENT_OF_PRODUCT':
      return {
        kind: 'ADDON',
        label,
        explanation: `${formatPct(addon.value)} of base product cost (${formatUsd(baseCents)})`,
        notes: 'Percentage of the product cost',
        amountCents: applyBps(baseCents, addon.value),
      };

    default: {
      const _exhaustive: never = addon.model;
      throw new Error(`Unknown add-on pricing model: ${String(_exhaustive)}`);
    }
  }
}
