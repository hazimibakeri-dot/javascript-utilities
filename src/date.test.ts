import { describe, expect, it } from 'vitest';
import {
  addDays,
  differenceInCalendarDays,
  formatDate,
  formatRelativeTime,
  isSameDay,
  isValidDate,
  parseDate,
  startOfDay,
  toISODate,
} from './date.js';

describe('test environment', () => {
  it('runs in a time zone with daylight saving time', () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).toBe(300); // EST, UTC-5
    expect(new Date(2026, 6, 15).getTimezoneOffset()).toBe(240); // EDT, UTC-4
  });
});

describe('isValidDate and parseDate', () => {
  it('detects invalid dates', () => {
    expect(isValidDate(new Date('2026-03-01'))).toBe(true);
    expect(isValidDate(new Date('not a date'))).toBe(false);
    expect(isValidDate('2026-03-01')).toBe(false);
  });

  it('parses strings, timestamps and dates, returning null for invalid input', () => {
    expect(parseDate('2026-03-01T00:00:00Z')?.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(parseDate(0)?.toISOString()).toBe('1970-01-01T00:00:00.000Z');
    expect(parseDate('31/12/2026')).toBeNull();
  });

  it('returns a copy rather than the original Date', () => {
    const original = new Date('2026-03-01T00:00:00Z');
    expect(parseDate(original)).not.toBe(original);
  });
});

describe('formatDate', () => {
  const instant = '2026-03-01T23:30:00Z';

  it('defaults to a medium date style', () => {
    expect(formatDate(instant, { locale: 'en-US', timeZone: 'UTC' })).toBe('Mar 1, 2026');
    expect(formatDate(instant, { locale: 'en-GB', timeZone: 'UTC' })).toBe('1 Mar 2026');
  });

  it('respects the requested time zone', () => {
    expect(formatDate(instant, { locale: 'en-US', timeZone: 'Asia/Tokyo' })).toBe('Mar 2, 2026');
  });

  it('accepts explicit Intl options', () => {
    expect(
      formatDate(instant, {
        locale: 'en-US',
        timeZone: 'UTC',
        weekday: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }),
    ).toBe('Sunday 23:30');
  });

  it('throws for invalid dates', () => {
    expect(() => formatDate('nope')).toThrow(RangeError);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-03-10T12:00:00Z');
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs);

  it.each([
    [-30_000, '30 seconds ago'],
    [-5 * 60_000, '5 minutes ago'],
    [3 * 3_600_000, 'in 3 hours'],
    [-86_400_000, 'yesterday'],
    [2 * 86_400_000, 'in 2 days'],
    [-14 * 86_400_000, '2 weeks ago'],
    [90 * 86_400_000, 'in 3 months'],
    [-800 * 86_400_000, '2 years ago'],
    [0, 'now'],
  ])('describes an offset of %d ms as %j', (offset, expected) => {
    expect(formatRelativeTime(at(offset), { now, locale: 'en' })).toBe(expected);
  });

  it('supports numeric "always" and other locales', () => {
    expect(formatRelativeTime(at(-86_400_000), { now, locale: 'en', numeric: 'always' })).toBe(
      '1 day ago',
    );
    expect(formatRelativeTime(at(-86_400_000), { now, locale: 'de' })).toBe('gestern');
  });

  it('throws for invalid dates', () => {
    expect(() => formatRelativeTime('nope', { now })).toThrow(RangeError);
  });
});

describe('toISODate', () => {
  it('returns the calendar date in the requested zone', () => {
    const instant = '2026-03-01T23:30:00Z';
    expect(toISODate(instant, { timeZone: 'UTC' })).toBe('2026-03-01');
    expect(toISODate(instant, { timeZone: 'Asia/Tokyo' })).toBe('2026-03-02');
    expect(toISODate(instant)).toBe('2026-03-01'); // local zone: New York
  });

  it('pads early years', () => {
    expect(toISODate(new Date(Date.UTC(999, 0, 5)), { timeZone: 'UTC' })).toBe('0999-01-05');
  });
});

describe('local calendar helpers', () => {
  it('adds days and keeps the local time across a DST change', () => {
    // US daylight saving time starts on 8 March 2026.
    const before = new Date(2026, 2, 7, 12, 0);
    const after = addDays(before, 2);
    expect(after.getDate()).toBe(9);
    expect(after.getHours()).toBe(12);
    expect(after.getTime() - before.getTime()).toBe(47 * 3_600_000);
    expect(before.getDate()).toBe(7); // input not mutated
  });

  it('handles month ends and negative amounts', () => {
    expect(addDays(new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(addDays(new Date(2026, 2, 1), -1).getDate()).toBe(28);
    expect(() => addDays(new Date(), 1.5)).toThrow(RangeError);
  });

  it('finds the start of the local day', () => {
    const start = startOfDay(new Date(2026, 2, 8, 15, 45, 30, 500));
    expect([
      start.getHours(),
      start.getMinutes(),
      start.getSeconds(),
      start.getMilliseconds(),
    ]).toEqual([0, 0, 0, 0]);
  });

  it('counts calendar days independent of the time of day and DST', () => {
    expect(differenceInCalendarDays(new Date(2026, 2, 9, 0, 30), new Date(2026, 2, 7, 23, 0))).toBe(
      2,
    );
    expect(differenceInCalendarDays(new Date(2026, 0, 1), new Date(2026, 11, 31))).toBe(-364);
    expect(isSameDay(new Date(2026, 2, 8, 0, 1), new Date(2026, 2, 8, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 2, 8), new Date(2026, 2, 9))).toBe(false);
  });
});
