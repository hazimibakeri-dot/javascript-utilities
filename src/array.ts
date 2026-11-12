import { assertFinite, assertInteger } from './internal.js';

/**
 * Splits an array into chunks of `size` items; the last chunk may be shorter.
 * @throws {RangeError} if `size` is not a positive integer.
 */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  assertInteger(size, 'size', 1);
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** Removes duplicates, keeping the first occurrence (SameValueZero equality, like Set). */
export function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/** Removes items whose key has already been seen, keeping the first occurrence. */
export function uniqueBy<T>(items: readonly T[], getKey: (item: T) => unknown): T[] {
  const seen = new Set<unknown>();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Groups items by a key. Returns an object without a prototype, so keys such as
 * "constructor" are safe. Modern runtimes also offer the built-in `Object.groupBy`.
 */
export function groupBy<T, K extends PropertyKey>(
  items: readonly T[],
  getKey: (item: T, index: number) => K,
): Partial<Record<K, T[]>> {
  const groups = Object.create(null) as Partial<Record<K, T[]>>;
  items.forEach((item, index) => {
    const key = getKey(item, index);
    (groups[key] ??= []).push(item);
  });
  return groups;
}

/** Splits items into `[matching, nonMatching]`. */
export function partition<T, S extends T>(
  items: readonly T[],
  predicate: (item: T) => item is S,
): [S[], Exclude<T, S>[]];
export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]];
export function partition<T>(items: readonly T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  for (const item of items) (predicate(item) ? pass : fail).push(item);
  return [pass, fail];
}

export type SortKey = string | number | bigint | boolean | Date | null | undefined;

export interface SortByOptions {
  order?: 'asc' | 'desc';
  /** Locale for string comparison. Defaults to the runtime's locale. */
  locale?: string;
}

/**
 * Returns a sorted copy. Stable (equal keys keep their order), compares strings with
 * Intl.Collator using numeric ordering ("item 2" before "item 10"), and always places
 * `null` and `undefined` keys last.
 */
export function sortBy<T>(
  items: readonly T[],
  getKey: (item: T) => SortKey,
  options: SortByOptions = {},
): T[] {
  const direction = options.order === 'desc' ? -1 : 1;
  const collator = new Intl.Collator(options.locale, { numeric: true });
  return items
    .map((item, index) => ({ item, index, key: getKey(item) }))
    .sort((a, b) => {
      if (a.key == null || b.key == null) {
        if (a.key == null && b.key == null) return a.index - b.index;
        return a.key == null ? 1 : -1;
      }
      const result = compareKeys(a.key, b.key, collator);
      return result === 0 ? a.index - b.index : result * direction;
    })
    .map((entry) => entry.item);
}

function compareKeys(a: NonNullable<SortKey>, b: NonNullable<SortKey>, collator: Intl.Collator) {
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b);
  const left = a instanceof Date ? a.getTime() : a;
  const right = b instanceof Date ? b.getTime() : b;
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Numbers from `start` up to but not including `end`. With one argument, counts from 0.
 * @example range(3) // [0, 1, 2]; range(10, 0, -5) // [10, 5]
 * @throws {RangeError} if `step` is 0 or any argument is not finite.
 */
export function range(start: number, end?: number, step = 1): number[] {
  const [from, to] = end === undefined ? [0, start] : [start, end];
  assertFinite(from, 'start');
  assertFinite(to, 'end');
  assertFinite(step, 'step');
  if (step === 0) throw new RangeError('step must not be 0');
  const result: number[] = [];
  for (let value = from; step > 0 ? value < to : value > to; value += step) result.push(value);
  return result;
}

/**
 * Removes `null` and `undefined`. Unlike lodash's `compact`, other falsy values (0, "",
 * false, NaN) are kept.
 */
export function compact<T>(items: readonly (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item !== null && item !== undefined);
}

/** Items present in both arrays (order of `a`, duplicates removed). */
export function intersection<T>(a: readonly T[], b: readonly T[]): T[] {
  const other = new Set(b);
  return unique(a.filter((item) => other.has(item)));
}

/** Items in `a` that are not in `b` (order of `a`). */
export function difference<T>(a: readonly T[], b: readonly T[]): T[] {
  const other = new Set(b);
  return a.filter((item) => !other.has(item));
}

/**
 * Returns a shuffled copy (Fisher–Yates). Uses Math.random by default, which is not
 * suitable for security-sensitive use such as lotteries or secrets.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap] as T, result[index] as T];
  }
  return result;
}
