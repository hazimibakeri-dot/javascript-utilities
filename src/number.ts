import { assertFinite, assertInteger } from './internal.js';

/**
 * Restricts a number to the inclusive range [min, max].
 * @throws {RangeError} if min is greater than max or any argument is not finite.
 */
export function clamp(value: number, min: number, max: number): number {
  assertFinite(value, 'value');
  assertFinite(min, 'min');
  assertFinite(max, 'max');
  if (min > max) throw new RangeError(`min (${min}) must not be greater than max (${max})`);
  return Math.min(Math.max(value, min), max);
}

/**
 * Rounds to a number of decimal places, half away from zero, avoiding common floating-point
 * surprises: roundTo(1.005, 2) is 1.01 (naive `Math.round(1.005 * 100) / 100` gives 1).
 * The result is still a binary floating-point number; use integers for money arithmetic.
 */
export function roundTo(value: number, decimals = 0): number {
  assertFinite(value, 'value');
  assertInteger(decimals, 'decimals', 0);
  const shift = (input: number, exponent: number) => {
    const [mantissa = '0', currentExponent = '0'] = String(input).split('e');
    return Number(`${mantissa}e${Number(currentExponent) + exponent}`);
  };
  const rounded = shift(Math.round(shift(Math.abs(value), decimals)), -decimals);
  return Math.sign(value) * rounded || 0;
}

/** True when `start <= value < end`. */
export function inRange(value: number, start: number, end: number): boolean {
  return value >= Math.min(start, end) && value < Math.max(start, end);
}

/** Sum of the numbers (0 for an empty list). */
export function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Arithmetic mean, or `undefined` for an empty list. */
export function average(values: readonly number[]): number | undefined {
  return values.length === 0 ? undefined : sum(values) / values.length;
}

export interface FormatNumberOptions extends Intl.NumberFormatOptions {
  /** BCP 47 locale, e.g. "de-DE". Defaults to the runtime's locale. */
  locale?: string | string[];
}

/**
 * Formats a number with Intl.NumberFormat.
 * @example formatNumber(1234.5, { locale: 'en-US' }) // "1,234.5"
 * @throws {RangeError} for NaN and Infinity.
 */
export function formatNumber(value: number, options: FormatNumberOptions = {}): string {
  assertFinite(value, 'value');
  const { locale, ...intlOptions } = options;
  return new Intl.NumberFormat(locale, intlOptions).format(value);
}

/**
 * Formats a ratio as a percentage: 0.256 -> "26%". Defaults to whole percentages.
 * @throws {RangeError} for NaN and Infinity.
 */
export function formatPercent(value: number, options: FormatNumberOptions = {}): string {
  return formatNumber(value, { maximumFractionDigits: 0, ...options, style: 'percent' });
}

/**
 * Short, human-friendly numbers: 1234 -> "1.2K", 2_500_000 -> "2.5M" (in English).
 * @throws {RangeError} for NaN and Infinity.
 */
export function formatCompact(value: number, options: FormatNumberOptions = {}): string {
  return formatNumber(value, { maximumFractionDigits: 1, ...options, notation: 'compact' });
}

export interface FormatBytesOptions {
  /** Maximum fraction digits. Defaults to 1. */
  decimals?: number;
  /** Use 1024-based units (KiB, MiB) instead of 1000-based units (kB, MB). */
  binary?: boolean;
  locale?: string | string[];
}

const DECIMAL_UNITS = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];
const BINARY_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];

/**
 * Formats a byte count: 1536 -> "1.5 kB", or "1.5 KiB" with `binary: true`.
 * @throws {RangeError} for NaN and Infinity.
 */
export function formatBytes(bytes: number, options: FormatBytesOptions = {}): string {
  assertFinite(bytes, 'bytes');
  const { decimals = 1, binary = false, locale } = options;
  assertInteger(decimals, 'decimals', 0);
  const base = binary ? 1024 : 1000;
  const units = binary ? BINARY_UNITS : DECIMAL_UNITS;
  const magnitude = Math.abs(bytes);

  let exponent =
    magnitude < base
      ? 0
      : Math.min(Math.floor(Math.log(magnitude) / Math.log(base)), units.length - 1);
  // Rounding can carry over to the next unit (999.96 kB -> "1000 kB"); move up when it does.
  if (exponent < units.length - 1 && roundTo(magnitude / base ** exponent, decimals) >= base) {
    exponent += 1;
  }
  const value = bytes / base ** exponent;
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: exponent === 0 ? 0 : decimals,
  }).format(value);
  return `${formatted} ${units[exponent]}`;
}
