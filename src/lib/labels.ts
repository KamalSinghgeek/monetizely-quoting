import type { TermLength } from '@prisma/client';
import { TERMS } from '@/lib/pricing/types';
import { formatPct, formatUsd } from '@/lib/pricing/money';

export const TERM_OPTIONS: { value: TermLength; label: string; sub: string }[] = [
  { value: 'MONTHLY', label: 'Monthly', sub: '1 month · no discount' },
  { value: 'ANNUAL', label: 'Annual', sub: '12 months · 15% off' },
  { value: 'TWO_YEAR', label: 'Two-year', sub: '24 months · 25% off' },
];

export function termLabel(term: TermLength): string {
  return TERMS[term].label;
}

/** "Annual (12 months, 15% discount applies to per-seat price)" — matches the reference quote voice. */
export function termDescription(term: TermLength): string {
  const t = TERMS[term];
  if (t.discountBps === 0) return `${t.label} (${t.months} month${t.months === 1 ? '' : 's'})`;
  return `${t.label} (${t.months} months, ${formatPct(t.discountBps)} discount applies to per-seat price)`;
}

export function addonModelLabel(model: string): string {
  switch (model) {
    case 'FIXED_MONTHLY':
      return 'Fixed monthly';
    case 'PER_SEAT':
      return 'Per seat / month';
    case 'PERCENT_OF_PRODUCT':
      return '% of product';
    default:
      return model;
  }
}

/** Render an add-on's stored price (cents for fixed/per-seat, basis points for percent). */
export function addonPriceLabel(model: string, value: number): string {
  switch (model) {
    case 'FIXED_MONTHLY':
      return `${formatUsd(value)} / month`;
    case 'PER_SEAT':
      return `${formatUsd(value)} / seat / month`;
    case 'PERCENT_OF_PRODUCT':
      return `${formatPct(value)} of product cost`;
    default:
      return String(value);
  }
}

export function availabilityLabel(availability: string): string {
  switch (availability) {
    case 'INCLUDED':
      return 'Included';
    case 'ADDON':
      return 'Add-on';
    case 'NOT_AVAILABLE':
      return 'Not available';
    default:
      return availability;
  }
}
