/**
 * Money & percentage utilities.
 *
 * Every monetary amount in this application is represented as an **integer number
 * of cents** (e.g. $50.00 -> 5000). Percentages are represented as **basis points**
 * (bps): 100% = 10000 bps, 15% = 1500 bps, 10% = 1000 bps.
 *
 * Why integers? Floating-point dollars accumulate rounding error ($0.1 + $0.2 != $0.3),
 * which produces off-by-a-cent quote totals. Working in integer cents keeps all
 * arithmetic exact until the single, well-defined rounding step in `applyBps`.
 *
 * Rounding policy: **round half up** at each percentage application (a line-item
 * boundary). This is conventional commercial rounding and is applied once per line
 * item before the line items are summed.
 */

/** Largest product (cents * bps) we trust to stay exact in a JS double. */
const MAX_SAFE_PRODUCT = Number.MAX_SAFE_INTEGER; // 9_007_199_254_740_991

/**
 * Apply a basis-point fraction to a cents amount, rounding half up to the nearest cent.
 *
 * @example applyBps(1_500_000, 8500) // 1_275_000  (85% of $15,000 = $12,750.00)
 * @example applyBps(5, 1000)         // 1          (10% of 5c = 0.5c -> rounds up to 1c)
 *
 * Implemented with integer arithmetic so there is no IEEE-754 rounding error:
 *   round_half_up(cents * bps / 10000) = floor((cents * bps + 5000) / 10000)
 * (5000 is half of the 10000 divisor.) Inputs are expected to be non-negative.
 */
export function applyBps(cents: number, bps: number): number {
  if (!Number.isInteger(cents) || !Number.isInteger(bps)) {
    throw new Error(`applyBps expects integer cents and bps, got (${cents}, ${bps})`);
  }
  const scaled = cents * bps;
  if (Math.abs(scaled) > MAX_SAFE_PRODUCT) {
    // Realistic quotes never reach this; guard against silent precision loss on absurd inputs.
    throw new Error(`applyBps overflow: ${cents} * ${bps} exceeds safe integer range`);
  }
  return Math.floor((scaled + 5000) / 10000);
}

/** Group an integer with US thousands separators: 1234567 -> "1,234,567". Deterministic (no locale data). */
function groupThousands(intValue: number): string {
  return Math.trunc(Math.abs(intValue))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format integer cents as USD. Whole-dollar amounts omit the cents for readability
 * (matches the reference quote's "$50 per seat per month" / "$200 per month" voice);
 * fractional amounts show two decimal places.
 *
 * @example formatUsd(5000)    // "$50"
 * @example formatUsd(1275000) // "$12,750"
 * @example formatUsd(1275050) // "$12,750.50"
 * @example formatUsd(-50000)  // "-$500"
 */
export function formatUsd(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remCents = abs % 100;
  const body =
    remCents === 0
      ? `$${groupThousands(dollars)}`
      : `$${groupThousands(dollars)}.${String(remCents).padStart(2, '0')}`;
  return negative ? `-${body}` : body;
}

/**
 * Format basis points as a percentage with no trailing zeros.
 *
 * @example formatPct(1500) // "15%"
 * @example formatPct(1050) // "10.5%"
 * @example formatPct(500)  // "5%"
 */
export function formatPct(bps: number): string {
  const pct = bps / 100;
  // Up to 2 decimal places, trailing zeros stripped.
  const str = pct.toFixed(2).replace(/\.?0+$/, '');
  return `${str}%`;
}

// --- Conversions between the UI (dollars / percent) and storage (cents / basis points) ---

/** $50.00 -> 5000 cents. Rounds to the nearest cent. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

/** 5000 cents -> 50 dollars (number). */
export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** 10 (percent) -> 1000 basis points. Rounds to the nearest basis point. */
export function percentToBps(percent: number): number {
  return Math.round(percent * 100);
}

/** 1000 basis points -> 10 (percent). */
export function bpsToPercent(bps: number): number {
  return bps / 100;
}
