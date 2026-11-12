import { describe, expect, it } from 'vitest';
import {
  chunk,
  compact,
  difference,
  groupBy,
  intersection,
  partition,
  range,
  shuffle,
  sortBy,
  unique,
  uniqueBy,
} from './array.js';

describe('chunk', () => {
  it('splits into equal chunks with a shorter last chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 3)).toEqual([]);
  });

  it('rejects invalid sizes', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
    expect(() => chunk([1], 1.5)).toThrow(RangeError);
  });
});

describe('unique and uniqueBy', () => {
  it('removes duplicates keeping the first occurrence', () => {
    expect(unique([3, 1, 3, 2, 1, NaN, NaN])).toEqual([3, 1, 2, NaN]);
    const users = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
      { id: 1, name: 'C' },
    ];
    expect(uniqueBy(users, (user) => user.id).map((user) => user.name)).toEqual(['A', 'B']);
  });
});

describe('groupBy', () => {
  it('groups items into a prototype-free object', () => {
    const groups = groupBy(['apple', 'avocado', 'banana'], (word) => word[0]!);
    expect(groups).toEqual({ a: ['apple', 'avocado'], b: ['banana'] });
    expect(Object.getPrototypeOf(groups)).toBeNull();
  });

  it('handles keys that exist on Object.prototype', () => {
    const groups = groupBy([1, 2], () => 'constructor');
    expect(groups.constructor).toEqual([1, 2]);
  });
});

describe('partition', () => {
  it('splits by a predicate', () => {
    expect(partition([1, 2, 3, 4], (n) => n % 2 === 0)).toEqual([
      [2, 4],
      [1, 3],
    ]);
  });

  it('narrows types with a type guard', () => {
    const [strings, numbers] = partition(['a', 1, 'b'], (v): v is string => typeof v === 'string');
    expect(strings.join('')).toBe('ab');
    expect(numbers.reduce((a, b) => a + b, 0)).toBe(1);
  });
});

describe('sortBy', () => {
  const items = [
    { name: 'item 10', price: 5, date: new Date('2026-01-03') },
    { name: 'item 2', price: 5, date: new Date('2026-01-01') },
    { name: 'Item 1', price: null, date: new Date('2026-01-02') },
  ];

  it('sorts strings naturally and is stable', () => {
    expect(sortBy(items, (item) => item.name, { locale: 'en' }).map((i) => i.name)).toEqual([
      'Item 1',
      'item 2',
      'item 10',
    ]);
    expect(sortBy(items, (item) => item.price).map((i) => i.name)).toEqual([
      'item 10',
      'item 2',
      'Item 1',
    ]);
  });

  it('sorts dates and supports descending order with nullish keys last', () => {
    expect(sortBy(items, (item) => item.date).map((i) => i.name)).toEqual([
      'item 2',
      'Item 1',
      'item 10',
    ]);
    expect(sortBy(items, (item) => item.price, { order: 'desc' }).at(-1)?.name).toBe('Item 1');
    expect(sortBy([null, undefined, 1], (v) => v)).toEqual([1, null, undefined]);
  });

  it('does not mutate the input', () => {
    const input = [3, 1, 2];
    expect(sortBy(input, (n) => n)).toEqual([1, 2, 3]);
    expect(input).toEqual([3, 1, 2]);
  });
});

describe('range', () => {
  it('creates sequences', () => {
    expect(range(4)).toEqual([0, 1, 2, 3]);
    expect(range(2, 5)).toEqual([2, 3, 4]);
    expect(range(10, 0, -5)).toEqual([10, 5]);
    expect(range(0, 1, 0.25)).toEqual([0, 0.25, 0.5, 0.75]);
    expect(range(5, 1)).toEqual([]);
  });

  it('rejects a zero or non-finite step', () => {
    expect(() => range(0, 5, 0)).toThrow(RangeError);
    expect(() => range(0, Infinity)).toThrow(RangeError);
  });
});

describe('compact, intersection and difference', () => {
  it('removes only null and undefined', () => {
    expect(compact([0, '', false, null, undefined, NaN, 'a'])).toEqual([0, '', false, NaN, 'a']);
  });

  it('compares sets of values', () => {
    expect(intersection([1, 2, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    expect(difference([1, 2, 3, 2], [2])).toEqual([1, 3]);
  });
});

describe('shuffle', () => {
  it('returns a permutation without mutating the input', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffle(input);
    expect([...result].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic with an injected random source', () => {
    expect(shuffle([1, 2, 3, 4], () => 0)).toEqual([2, 3, 4, 1]);
  });
});
