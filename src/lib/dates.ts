/**
 * Date helpers for quotes. All math and formatting is done in UTC so a quote renders
 * the same date regardless of the server's or viewer's timezone.
 */

/**
 * Add a whole number of calendar months to a date (UTC), clamping the day to the end
 * of the target month when needed (e.g. Jan 31 + 1 month -> Feb 28).
 *
 * The reference quote shows "Quote date: May 21" -> "Valid until: June 21", i.e. one
 * calendar month later (NOT +30 days, which would be June 20).
 *
 * @example addMonths(Date.UTC(2026, 4, 21), 1) // 2026-06-21
 */
export function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  const targetYear = year + Math.floor((month + months) / 12);
  const targetMonth = ((month + months) % 12 + 12) % 12;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format a date as "June 21, 2026" (UTC, deterministic — no locale data required).
 */
export function formatDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
