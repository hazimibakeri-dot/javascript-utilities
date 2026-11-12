import { describe, expect, it } from 'vitest';
import {
  average,
  clamp,
  formatBytes,
  formatCompact,
  formatNumber,
  formatPercent,
  inRange,
  roundTo,
  sum,
} from './number.js';

describe('clamp', () => {
  it('restricts values to a range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('rejects an inverted range and invalid numbers', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
    expect(() => clamp(NaN, 0, 1)).toThrow(RangeError);
  });
});

describe('roundTo', () => {
  it('avoids common floating-point rounding errors', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(roundTo(2.675, 2)).toBe(2.68);
    expect(roundTo(0.1 + 0.2, 2)).toBe(0.3);
  });

  it('rounds half away from zero', () => {
    expect(roundTo(2.5)).toBe(3);
    expect(roundTo(-2.5)).toBe(-3);
    expect(roundTo(-1.005, 2)).toBe(-1.01);
    expect(Object.is(roundTo(-0.001, 2), 0)).toBe(true);
  });

  it('handles numbers written in exponent notation', () => {
    expect(roundTo(1.23456e-7, 9)).toBe(1.23e-7);
    expect(roundTo(1e21, 2)).toBe(1e21);
  });

  it('rejects invalid input', () => {
    expect(() => roundTo(Infinity, 2)).toThrow(RangeError);
    expect(() => roundTo(1, -1)).toThrow(RangeError);
  });
});

describe('inRange, sum and average', () => {
  it('checks half-open ranges in either direction', () => {
    expect(inRange(5, 0, 10)).toBe(true);
    expect(inRange(10, 0, 10)).toBe(false);
    expect(inRange(5, 10, 0)).toBe(true);
  });

  it('sums and averages', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(sum([])).toBe(0);
    expect(average([2, 4, 9])).toBe(5);
    expect(average([])).toBeUndefined();
  });
});

describe('number formatting', () => {
  it('formats numbers for a locale', () => {
    expect(formatNumber(1234567.891, { locale: 'en-US' })).toBe('1,234,567.891');
    expect(formatNumber(1234567.891, { locale: 'de-DE', maximumFractionDigits: 1 })).toBe(
      '1.234.567,9',
    );
  });

  it('formats percentages and compact numbers', () => {
    expect(formatPercent(0.256, { locale: 'en-US' })).toBe('26%');
    expect(formatPercent(0.2567, { locale: 'en-US', maximumFractionDigits: 1 })).toBe('25.7%');
    expect(formatCompact(1234, { locale: 'en-US' })).toBe('1.2K');
    expect(formatCompact(2_500_000, { locale: 'en-US' })).toBe('2.5M');
  });

  it('rejects NaN and Infinity', () => {
    expect(() => formatNumber(NaN)).toThrow(RangeError);
    expect(() => formatPercent(Infinity)).toThrow(RangeError);
  });
});

describe('formatBytes', () => {
  it.each([
    [0, {}, '0 B'],
    [999, {}, '999 B'],
    [1536, {}, '1.5 kB'],
    [1536, { binary: true }, '1.5 KiB'],
    [1_000_000, {}, '1 MB'],
    [999_960, {}, '1 MB'],
    [5_368_709_120, { binary: true, decimals: 2 }, '5 GiB'],
    [-2048, { binary: true }, '-2 KiB'],
    [1e30, {}, '1,000,000,000,000 EB'],
  ])('formats %d bytes', (bytes, options, expected) => {
    expect(formatBytes(bytes, { locale: 'en-US', ...options })).toBe(expected);
  });

  it('rejects invalid input', () => {
    expect(() => formatBytes(NaN)).toThrow(RangeError);
    expect(() => formatBytes(10, { decimals: -1 })).toThrow(RangeError);
  });
});
