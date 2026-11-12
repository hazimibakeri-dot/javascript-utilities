import { describe, expect, it } from 'vitest';
import {
  allocateMinorUnits,
  formatCurrency,
  formatMinorUnits,
  fromMinorUnits,
  getCurrencyFractionDigits,
  toMinorUnits,
} from './currency.js';

const NBSP = ' ';

describe('getCurrencyFractionDigits', () => {
  it('reads minor-unit digits from Intl data', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('jpy')).toBe(0);
    expect(getCurrencyFractionDigits('KWD')).toBe(3);
  });

  it('rejects malformed codes', () => {
    expect(() => getCurrencyFractionDigits('US')).toThrow(RangeError);
    expect(() => getCurrencyFractionDigits('US$')).toThrow(RangeError);
  });
});

describe('formatCurrency', () => {
  it('formats for a locale', () => {
    expect(formatCurrency(1234.5, 'USD', { locale: 'en-US' })).toBe('$1,234.50');
    expect(formatCurrency(1234.5, 'EUR', { locale: 'de-DE' })).toBe(`1.234,50${NBSP}€`);
    expect(formatCurrency(1500, 'JPY', { locale: 'ja-JP' })).toBe('￥1,500');
  });

  it('passes through Intl options', () => {
    expect(formatCurrency(-5, 'USD', { locale: 'en-US', currencySign: 'accounting' })).toBe(
      '($5.00)',
    );
    expect(formatCurrency(5, 'USD', { locale: 'en-CA', currencyDisplay: 'code' })).toBe(
      `USD${NBSP}5.00`,
    );
  });

  it('rejects invalid amounts and codes', () => {
    expect(() => formatCurrency(NaN, 'USD')).toThrow(RangeError);
    expect(() => formatCurrency(1, 'dollars')).toThrow(RangeError);
  });
});

describe('minor units', () => {
  it('converts amounts to integer minor units without float drift', () => {
    expect(toMinorUnits(19.99, 'USD')).toBe(1999);
    expect(toMinorUnits(1.005, 'USD')).toBe(101);
    expect(toMinorUnits(0.1 + 0.2, 'USD')).toBe(30);
    expect(toMinorUnits(1500.4, 'JPY')).toBe(1500);
    expect(toMinorUnits(1.2345, 'KWD')).toBe(1235);
    expect(toMinorUnits(-10.005, 'EUR')).toBe(-1001);
  });

  it('converts back and formats minor units', () => {
    expect(fromMinorUnits(1999, 'USD')).toBe(19.99);
    expect(fromMinorUnits(1500, 'JPY')).toBe(1500);
    expect(formatMinorUnits(1999, 'USD', { locale: 'en-US' })).toBe('$19.99');
    expect(() => fromMinorUnits(19.5, 'USD')).toThrow(RangeError);
  });
});

describe('allocateMinorUnits', () => {
  it('splits without losing a single unit', () => {
    expect(allocateMinorUnits(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(allocateMinorUnits(1000, [50, 30, 20])).toEqual([500, 300, 200]);
    expect(allocateMinorUnits(5, [1, 1])).toEqual([3, 2]);
    expect(allocateMinorUnits(-100, [1, 1, 1])).toEqual([-34, -33, -33]);
    expect(allocateMinorUnits(0, [1, 2])).toEqual([0, 0]);
  });

  it('keeps the total for awkward ratios', () => {
    const shares = allocateMinorUnits(1001, [0.3, 0.3, 0.4]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(1001);
  });

  it('rejects invalid input', () => {
    expect(() => allocateMinorUnits(10.5, [1])).toThrow(RangeError);
    expect(() => allocateMinorUnits(10, [])).toThrow(RangeError);
    expect(() => allocateMinorUnits(10, [1, -1])).toThrow(RangeError);
    expect(() => allocateMinorUnits(10, [0, 0])).toThrow(RangeError);
  });
});
