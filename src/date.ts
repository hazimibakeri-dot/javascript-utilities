import { assertInteger } from './internal.js';

export type DateInput = Date | string | number;

const DAY_MS = 86_400_000;

/** True for Date objects that hold a valid time (not `Invalid Date`). */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Converts a Date, timestamp (milliseconds) or date string to a new Date, or `null` when
 * the input is not a valid date.
 *
 * Time zone note: date-only ISO strings ("2026-03-01") are parsed as UTC midnight, while
 * date-time strings without an offset ("2026-03-01T09:00") are parsed as local time. Prefer
 * strings with an explicit offset or "Z".
 */
export function parseDate(input: DateInput): Date | null {
  const date = input instanceof Date ? new Date(input.getTime()) : new Date(input);
  return isValidDate(date) ? date : null;
}

function toValidDate(input: DateInput): Date {
  const date = parseDate(input);
  if (!date) throw new RangeError(`Invalid date: ${String(input)}`);
  return date;
}

export interface FormatDateOptions extends Intl.DateTimeFormatOptions {
  /** BCP 47 locale, e.g. "en-GB". Defaults to the runtime's locale. */
  locale?: string | string[];
}

const COMPONENT_OPTIONS = [
  'dateStyle',
  'timeStyle',
  'weekday',
  'era',
  'year',
  'month',
  'day',
  'dayPeriod',
  'hour',
  'minute',
  'second',
  'fractionalSecondDigits',
  'timeZoneName',
] as const;

/**
 * Formats a date with Intl.DateTimeFormat. Defaults to `{ dateStyle: 'medium' }` when no
 * date or time fields are requested.
 * @example formatDate('2026-03-01T12:00:00Z', { locale: 'en-GB', timeZone: 'UTC' }) // "1 Mar 2026"
 * @throws {RangeError} for invalid dates.
 */
export function formatDate(input: DateInput, options: FormatDateOptions = {}): string {
  const { locale, ...intlOptions } = options;
  const hasComponents = COMPONENT_OPTIONS.some((key) => intlOptions[key] !== undefined);
  return new Intl.DateTimeFormat(
    locale,
    hasComponents ? intlOptions : { dateStyle: 'medium', ...intlOptions },
  ).format(toValidDate(input));
}

export interface RelativeTimeOptions {
  /** Reference point. Defaults to the current time. */
  now?: DateInput;
  locale?: string | string[];
  /** `auto` (default) allows phrases such as "yesterday"; `always` gives "1 day ago". */
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * DAY_MS],
  ['month', 30 * DAY_MS],
  ['week', 7 * DAY_MS],
  ['day', DAY_MS],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
];

/**
 * Describes a date relative to now, e.g. "3 hours ago" or "in 2 days", choosing the largest
 * sensible unit. Months and years are approximated as 30 and 365 days.
 * @throws {RangeError} for invalid dates.
 */
export function formatRelativeTime(input: DateInput, options: RelativeTimeOptions = {}): string {
  const { now = new Date(), locale, numeric = 'auto', style = 'long' } = options;
  const diff = toValidDate(input).getTime() - toValidDate(now).getTime();
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric, style });
  for (const [unit, size] of RELATIVE_UNITS) {
    if (Math.abs(diff) >= size || unit === 'second') {
      // `|| 0` turns -0 into 0 so the output reads "now"/"in 0 seconds" rather than "0 seconds ago".
      return formatter.format(Math.round(diff / size) || 0, unit);
    }
  }
  /* c8 ignore next */
  throw new Error('Unreachable');
}

/**
 * Returns the calendar date as "YYYY-MM-DD" in a time zone (default: the runtime's local
 * zone). The same instant can be a different calendar day in different zones.
 * @example toISODate('2026-03-01T23:30:00Z', { timeZone: 'Asia/Tokyo' }) // "2026-03-02"
 */
export function toISODate(input: DateInput, options: { timeZone?: string } = {}): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: options.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(toValidDate(input));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year').padStart(4, '0')}-${get('month')}-${get('day')}`;
}

/**
 * Adds calendar days in the local time zone, keeping the local clock time across daylight
 * saving changes (so a "day" may be 23 or 25 hours long). Returns a new Date.
 */
export function addDays(input: DateInput, days: number): Date {
  assertInteger(days, 'days');
  const date = toValidDate(input);
  date.setDate(date.getDate() + days);
  return date;
}

/** Midnight at the start of the same local calendar day. Returns a new Date. */
export function startOfDay(input: DateInput): Date {
  const date = toValidDate(input);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Whether two dates fall on the same local calendar day. */
export function isSameDay(a: DateInput, b: DateInput): boolean {
  return differenceInCalendarDays(a, b) === 0;
}

/**
 * Number of local calendar days from `earlier` to `later` (negative if `later` is before),
 * ignoring the time of day. Safe across daylight saving changes.
 */
export function differenceInCalendarDays(later: DateInput, earlier: DateInput): number {
  const a = toValidDate(later);
  const b = toValidDate(earlier);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcA - utcB) / DAY_MS);
}
