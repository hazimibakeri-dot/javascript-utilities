import { describe, expect, it } from 'vitest';
import {
  isE164Phone,
  isEmail,
  isHexColor,
  isIsoDateString,
  isNonEmptyString,
  isNumeric,
  isUrl,
  isUuid,
} from './validation.js';

describe('isNonEmptyString', () => {
  it('requires a non-whitespace character', () => {
    expect(isNonEmptyString('a')).toBe(true);
    expect(isNonEmptyString('   ')).toBe(false);
    expect(isNonEmptyString(1)).toBe(false);
  });
});

describe('isEmail', () => {
  it.each(['name@example.com', 'first.last+tag@sub.example.co.uk', 'x@y.io'])('accepts %s', (v) => {
    expect(isEmail(v)).toBe(true);
  });

  it.each([
    'plainaddress',
    '@example.com',
    'name@',
    'name@domain',
    'name @example.com',
    'name..dots@example.com',
    '.name@example.com',
    'name.@example.com',
    'name@example..com',
    `${'a'.repeat(65)}@example.com`,
    `a@${'b'.repeat(250)}.com`,
    42,
  ])('rejects %s', (v) => {
    expect(isEmail(v)).toBe(false);
  });
});

describe('isUrl', () => {
  it('accepts absolute http and https URLs', () => {
    expect(isUrl('https://example.com/path?q=1')).toBe(true);
    expect(isUrl('http://localhost:3000')).toBe(true);
  });

  it('rejects relative, malformed and disallowed URLs', () => {
    expect(isUrl('/relative')).toBe(false);
    expect(isUrl('not a url')).toBe(false);
    expect(isUrl('javascript:alert(1)')).toBe(false);
    expect(isUrl('ftp://example.com')).toBe(false);
    expect(isUrl(null)).toBe(false);
  });

  it('allows custom protocols', () => {
    expect(isUrl('mailto:hello@example.com', { protocols: ['mailto:'] })).toBe(true);
    expect(isUrl('ftp://example.com', { protocols: ['ftp:'] })).toBe(true);
  });
});

describe('isUuid', () => {
  it('accepts RFC 9562 UUIDs and checks versions', () => {
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000', 4)).toBe(true);
    expect(isUuid('123e4567-e89b-42d3-a456-426614174000', 7)).toBe(false);
    expect(isUuid('01890a5d-ac96-774b-bcce-b302099a8057', 7)).toBe(true);
  });

  it('handles nil/max UUIDs and rejects malformed values', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isUuid('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
    expect(isUuid('00000000-0000-0000-0000-000000000000', 4)).toBe(false);
    expect(isUuid('123e4567-e89b-02d3-a456-426614174000')).toBe(false);
    expect(isUuid('123e4567e89b42d3a456426614174000')).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

describe('isHexColor, isNumeric, isIsoDateString and isE164Phone', () => {
  it('validates hex colours', () => {
    for (const value of ['#fff', '#ffff', '#a1b2c3', '#A1B2C3D4'])
      expect(isHexColor(value)).toBe(true);
    for (const value of ['fff', '#ff', '#ggg', '#12345']) expect(isHexColor(value)).toBe(false);
  });

  it('validates decimal number strings', () => {
    for (const value of ['42', '-3.5', '.5', '5.', '+1e3', ' 7 ', 12])
      expect(isNumeric(value)).toBe(true);
    for (const value of ['1,000', '1.2.3', '', 'abc', NaN, Infinity, '0x10']) {
      expect(isNumeric(value)).toBe(false);
    }
  });

  it('validates real calendar dates', () => {
    expect(isIsoDateString('2024-02-29')).toBe(true);
    expect(isIsoDateString('2026-02-29')).toBe(false);
    expect(isIsoDateString('2026-13-01')).toBe(false);
    expect(isIsoDateString('2026-1-01')).toBe(false);
    expect(isIsoDateString(20260101)).toBe(false);
  });

  it('validates the E.164 phone format', () => {
    expect(isE164Phone('+14155550123')).toBe(true);
    expect(isE164Phone('+0123')).toBe(false);
    expect(isE164Phone('4155550123')).toBe(false);
    expect(isE164Phone('+1234567890123456')).toBe(false);
  });
});
