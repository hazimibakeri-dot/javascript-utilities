import { describe, expect, it } from 'vitest';
import { deepEqual, deepMerge, get, isPlainObject, mapValues, omit, pick } from './object.js';

describe('isPlainObject', () => {
  it.each([
    [{}, true],
    [Object.create(null), true],
    [[], false],
    [new Date(), false],
    [null, false],
    [new (class Example {})(), false],
    ['text', false],
  ])('%#: returns %s', (value, expected) => {
    expect(isPlainObject(value)).toBe(expected);
  });
});

describe('pick and omit', () => {
  const user = { id: 1, name: 'Ada', email: 'ada@example.com' };

  it('picks listed own properties', () => {
    expect(pick(user, ['id', 'name'])).toEqual({ id: 1, name: 'Ada' });
  });

  it('omits listed properties without mutating the source', () => {
    expect(omit(user, ['email'])).toEqual({ id: 1, name: 'Ada' });
    expect(user).toHaveProperty('email');
  });
});

describe('deepMerge', () => {
  const defaults = {
    theme: { colors: { primary: 'blue', text: 'black' }, radius: 4 },
    features: ['search'],
    debug: false,
  };

  it('merges nested objects and replaces arrays', () => {
    const merged = deepMerge(defaults, {
      theme: { colors: { primary: 'purple' } },
      features: ['export'],
    });
    expect(merged).toEqual({
      theme: { colors: { primary: 'purple', text: 'black' }, radius: 4 },
      features: ['export'],
      debug: false,
    });
  });

  it('ignores undefined values and does not mutate inputs', () => {
    const override = { debug: undefined, theme: { radius: 8 } };
    const merged = deepMerge(defaults, override);
    expect(merged.debug).toBe(false);
    expect(defaults.theme.radius).toBe(4);
    expect(merged.features).not.toBe(defaults.features);
  });

  it('applies several overrides in order', () => {
    expect(deepMerge({ a: 1, b: 1 }, { a: 2 }, { b: 3 })).toEqual({ a: 2, b: 3 });
  });

  it('blocks prototype pollution', () => {
    const malicious = JSON.parse('{"__proto__": {"polluted": true}, "safe": 1}') as object;
    const merged = deepMerge({}, malicious) as Record<string, unknown>;
    expect(merged.safe).toBe(1);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(merged)).toBe(Object.prototype);
  });
});

describe('get', () => {
  const data = { a: { b: [{ c: 1 }, { c: 0 }] }, nil: null };

  it('reads nested values by string or array path', () => {
    expect(get(data, 'a.b[0].c')).toBe(1);
    expect(get(data, ['a', 'b', 1, 'c'])).toBe(0);
  });

  it('returns the default for missing paths', () => {
    expect(get(data, 'a.x.y', 'fallback')).toBe('fallback');
    expect(get(data, 'nil.value', 42)).toBe(42);
    expect(get(undefined, 'a')).toBeUndefined();
  });
});

describe('mapValues', () => {
  it('transforms values and keeps keys', () => {
    expect(mapValues({ a: 1, b: 2 }, (value, key) => `${key}${value * 2}`)).toEqual({
      a: 'a2',
      b: 'b4',
    });
  });
});

describe('deepEqual', () => {
  it('compares primitives with SameValueZero', () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(deepEqual(0, -0)).toBe(true);
    expect(deepEqual(1, '1')).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
  });

  it('compares arrays and nested objects', () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], { 0: 1, 1: 2 })).toBe(false);
  });

  it('compares dates, regular expressions, maps and sets', () => {
    expect(deepEqual(new Date(0), new Date(0))).toBe(true);
    expect(deepEqual(new Date(0), new Date(1))).toBe(false);
    expect(deepEqual(/a/gi, /a/gi)).toBe(true);
    expect(deepEqual(/a/g, /a/i)).toBe(false);
    expect(deepEqual(new Map([['a', { x: 1 }]]), new Map([['a', { x: 1 }]]))).toBe(true);
    expect(deepEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false);
    expect(deepEqual(new Map([['a', 1]]), new Map())).toBe(false);
    expect(deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
    expect(deepEqual(new Set([1]), new Set([2]))).toBe(false);
    expect(deepEqual(new Set([1]), new Set([1, 2]))).toBe(false);
  });

  it('handles circular references', () => {
    type Node = { name: string; self?: Node };
    const a: Node = { name: 'x' };
    a.self = a;
    const b: Node = { name: 'x' };
    b.self = b;
    expect(deepEqual(a, b)).toBe(true);
  });
});
