/**
 * Pricing engine types. These are pure data types with no dependency on the database
 * or UI layer, so the engine can be unit-tested in isolation.
 */

/** Contract term. Discount applies ONLY to the product per-seat base price, never to add-ons. */
export type TermLength = 'MONTHLY' | 'ANNUAL' | 'TWO_YEAR';

/**
 * How a paid add-on is priced for a given (tier, feature):
 * - FIXED_MONTHLY:      flat price per month (value = cents/month)
 * - PER_SEAT:           price per seat per month (value = cents/seat/month); seat count is
 *                       chosen on the quote, independent of the product's seat count.
 * - PERCENT_OF_PRODUCT: a percentage of the product's (discounted) base line (value = basis points)
 */
export type AddonPricingModel = 'FIXED_MONTHLY' | 'PER_SEAT' | 'PERCENT_OF_PRODUCT';

export interface TermInfo {
  /** Number of months the quote total covers. */
  months: number;
  /** Discount on the per-seat base price, in basis points (1500 = 15%). */
  discountBps: number;
  /** Human label, e.g. "Annual". */
  label: string;
}

/** Standard terms across all clients (from the spec): monthly 0%, annual 15%, two-year 25%. */
export const TERMS: Record<TermLength, TermInfo> = {
  MONTHLY: { months: 1, discountBps: 0, label: 'Monthly' },
  ANNUAL: { months: 12, discountBps: 1500, label: 'Annual' },
  TWO_YEAR: { months: 24, discountBps: 2500, label: 'Two-year' },
};

/** An add-on the analyst selected for the quote, with its resolved pricing. */
export interface SelectedAddon {
  featureName: string;
  model: AddonPricingModel;
  /** cents (FIXED_MONTHLY, PER_SEAT) or basis points (PERCENT_OF_PRODUCT). */
  value: number;
  /** Required for PER_SEAT add-ons; independent of the product seat count. */
  addonSeats?: number;
}

/** Everything the engine needs to compute a quote. No DB/UI types leak in here. */
export interface PricingInput {
  productName: string;
  tierName: string;
  /** Per seat per month, in cents. */
  basePriceCents: number;
  seats: number;
  term: TermLength;
  addons: SelectedAddon[];
  /** Optional overall discount applied to the whole quote, in basis points. */
  overallDiscountBps?: number;
}

export type LineItemKind = 'BASE' | 'ADDON' | 'DISCOUNT';

/**
 * A single line of the quote. `amountCents` and `explanation` are produced together
 * by the engine from the same inputs, so the displayed number can never drift from
 * the displayed formula.
 */
export interface LineItem {
  kind: LineItemKind;
  /** e.g. "Analytics Suite - Growth tier" or "Add-on: API access". */
  label: string;
  /** Human-readable derivation, e.g. "25 seats × $50 per seat per month × 12 months". */
  explanation: string;
  /** Optional clarifying note, e.g. "Per-seat add-on (seat count independent of product seats)". */
  notes?: string;
  /** Line total in cents. Negative for DISCOUNT lines. */
  amountCents: number;
}

export interface PricingResult {
  lineItems: LineItem[];
  /** Sum of BASE + ADDON lines (before any overall discount), in cents. */
  subtotalCents: number;
  /** Magnitude of the overall quote discount, in cents (0 if none). */
  discountCents: number;
  /** Final total = subtotal − discount, in cents. */
  totalCents: number;
  termMonths: number;
  termDiscountBps: number;
}
