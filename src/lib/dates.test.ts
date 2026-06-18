import { describe, expect, it } from 'vitest';
import { addMonths, formatDate } from './dates';

describe('addMonths', () => {
  it('adds one calendar month (the reference: May 21 -> June 21, NOT +30 days)', () => {
    const result = addMonths(new Date(Date.UTC(2026, 4, 21)), 1); // May = month 4
    expect(formatDate(result)).toBe('June 21, 2026');
  });

  it('clamps the day to the end of a shorter target month', () => {
    const result = addMonths(new Date(Date.UTC(2026, 0, 31)), 1); // Jan 31 2026
    expect(formatDate(result)).toBe('February 28, 2026');
  });

  it('rolls over the year', () => {
    const result = addMonths(new Date(Date.UTC(2026, 11, 15)), 1); // Dec 15 2026
    expect(formatDate(result)).toBe('January 15, 2027');
  });
});

describe('formatDate', () => {
  it('formats as "Month D, YYYY" in UTC', () => {
    expect(formatDate(new Date(Date.UTC(2026, 5, 21)))).toBe('June 21, 2026');
    expect(formatDate(new Date(Date.UTC(2026, 0, 1)))).toBe('January 1, 2026');
  });
});
