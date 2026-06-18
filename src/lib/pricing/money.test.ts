import { describe, expect, it } from 'vitest';
import { applyBps, formatPct, formatUsd } from './money';

describe('applyBps', () => {
  it('reproduces the reference base-line discount exactly', () => {
    // 85% of $15,000 (25 seats × $50 × 12 months) = $12,750.00
    expect(applyBps(1_500_000, 8500)).toBe(1_275_000);
  });

  it('rounds half up at the cent boundary', () => {
    expect(applyBps(5, 1000)).toBe(1); // 10% of 5c = 0.5c -> 1c
    expect(applyBps(1005, 1000)).toBe(101); // 10% of 1005c = 100.5c -> 101c
    expect(applyBps(1015, 1000)).toBe(102); // 10% of 1015c = 101.5c -> 102c
  });

  it('does not round when the result is already exact', () => {
    expect(applyBps(1010, 1000)).toBe(101); // exactly 101.0c
    expect(applyBps(1000, 1000)).toBe(100); // exactly 100.0c
    expect(applyBps(12345, 10000)).toBe(12345); // 100% is identity
    expect(applyBps(99999, 0)).toBe(0); // 0% is zero
  });

  it('avoids floating-point drift that naive math would introduce', () => {
    // Naive: Math.round(2999 * 0.1) relies on 0.1 being inexact; integer math is exact.
    expect(applyBps(2999, 1000)).toBe(300); // 299.9c -> 300c
    expect(applyBps(2994, 1000)).toBe(299); // 299.4c -> 299c
  });

  it('rejects non-integer inputs', () => {
    expect(() => applyBps(100.5, 1000)).toThrow();
    expect(() => applyBps(100, 10.5)).toThrow();
  });

  it('throws rather than silently lose precision on absurd inputs', () => {
    expect(() => applyBps(1e15, 10000)).toThrow(/overflow/);
  });
});

describe('formatUsd', () => {
  it('omits cents for whole-dollar amounts', () => {
    expect(formatUsd(5000)).toBe('$50');
    expect(formatUsd(20000)).toBe('$200');
    expect(formatUsd(1_275_000)).toBe('$12,750');
    expect(formatUsd(0)).toBe('$0');
    expect(formatUsd(100)).toBe('$1');
  });

  it('shows two decimals for fractional amounts', () => {
    expect(formatUsd(1_275_050)).toBe('$12,750.50');
    expect(formatUsd(99)).toBe('$0.99');
    expect(formatUsd(1_234_567)).toBe('$12,345.67');
  });

  it('formats negative amounts (discount lines)', () => {
    expect(formatUsd(-50_000)).toBe('-$500');
    expect(formatUsd(-181_550)).toBe('-$1,815.50');
  });
});

describe('formatPct', () => {
  it('strips trailing zeros', () => {
    expect(formatPct(1500)).toBe('15%');
    expect(formatPct(2500)).toBe('25%');
    expect(formatPct(500)).toBe('5%');
    expect(formatPct(0)).toBe('0%');
    expect(formatPct(10000)).toBe('100%');
  });

  it('keeps fractional percentages', () => {
    expect(formatPct(1050)).toBe('10.5%');
    expect(formatPct(1025)).toBe('10.25%');
  });
});
