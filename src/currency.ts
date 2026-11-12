import { assertFinite, assertInteger } from './internal.js';
import { roundTo } from './number.js';

const CURRENCY_CODE = /^[A-Z]{3}$/;

function normalizeCurrency(currency: string): string {
  const code = currency.trim().toUpperCase();
  if (!CURRENCY_CODE.test(code)) {
    throw new RangeError(`Invalid ISO 4217 currency code: "${currency}"`);
  }
  return code;
}

/**
 * Number of minor-unit digits for a currency according to the runtime's Intl data:
 * 2 for USD and EUR, 0 for JPY, 3 for KWD. Results can differ between runtimes.
 * @throws {RangeError} for malformed codes.
 */
export function getCurrencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency: normalizeCurrency(currency),
    }).resolvedOptions().maximumFractionDigits ?? 2
  );
}

export interface FormatCurrencyOptions extends Omit<
  Intl.NumberFormatOptions,
  'style' | 'currency'
> {
  /** BCP 47 locale. Defaults to the runtime's locale. The symbol and layout depend on it. */
  locale?: string | string[];
}

/**
 * Formats an amount of money.
 * @example formatCurrency(1234.5, 'EUR', { locale: 'de-DE' }) // "1.234,50 €"
 * @throws {RangeError} for NaN, Infinity or malformed currency codes.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  options: FormatCurrencyOptions = {},
): string {
  assertFinite(amount, 'amount');
  const { locale, ...intlOptions } = options;
  return new Intl.NumberFormat(locale, {
    ...intlOptions,
    style: 'currency',
    currency: normalizeCurrency(currency),
  }).format(amount);
}

/**
 * Converts a decimal amount to integer minor units (cents, pence, …), rounding half away
 * from zero: toMinorUnits(19.99, 'USD') -> 1999; toMinorUnits(1500, 'JPY') -> 1500.
 * Store and add money as minor units to avoid floating-point errors.
 */
export function toMinorUnits(amount: number, currency: string): number {
  assertFinite(amount, 'amount');
  const digits = getCurrencyFractionDigits(currency);
  return Math.round(roundTo(amount, digits) * 10 ** digits) || 0;
}

/** Converts integer minor units back to a decimal amount: 1999 USD -> 19.99. */
export function fromMinorUnits(minorUnits: number, currency: string): number {
  assertInteger(minorUnits, 'minorUnits');
  const digits = getCurrencyFractionDigits(currency);
  return roundTo(minorUnits / 10 ** digits, digits);
}

/** Formats integer minor units: formatMinorUnits(1999, 'USD', { locale: 'en-US' }) -> "$19.99". */
export function formatMinorUnits(
  minorUnits: number,
  currency: string,
  options: FormatCurrencyOptions = {},
): string {
  return formatCurrency(fromMinorUnits(minorUnits, currency), currency, options);
}

/**
 * Splits an integer amount of minor units by ratios without losing or creating any unit,
 * using the largest-remainder method. allocateMinorUnits(100, [1, 1, 1]) -> [34, 33, 33].
 * @throws {RangeError} for non-integer totals, negative ratios or ratios that sum to 0.
 */
export function allocateMinorUnits(total: number, ratios: readonly number[]): number[] {
  assertInteger(total, 'total');
  if (ratios.length === 0) throw new RangeError('ratios must not be empty');
  for (const ratio of ratios) {
    assertFinite(ratio, 'ratio');
    if (ratio < 0) throw new RangeError('ratios must not be negative');
  }
  const ratioSum = ratios.reduce((sum, ratio) => sum + ratio, 0);
  if (ratioSum === 0) throw new RangeError('ratios must not all be 0');

  const sign = total < 0 ? -1 : 1;
  const magnitude = Math.abs(total);
  const exact = ratios.map((ratio) => (magnitude * ratio) / ratioSum);
  const shares = exact.map(Math.floor);
  let remainder = magnitude - shares.reduce((sum, share) => sum + share, 0);

  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder === 0) break;
    shares[index] = (shares[index] ?? 0) + 1;
    remainder -= 1;
  }
  return shares.map((share) => share * sign || 0);
}
