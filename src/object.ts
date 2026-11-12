/** True for `{}`-style objects and `Object.create(null)`, false for arrays, dates, class instances and null. */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

/** A new object with only the listed own properties. */
export function pick<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(source, key)) result[key] = source[key];
  }
  return result;
}

/** A shallow copy without the listed properties. */
export function omit<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Omit<T, K> {
  const result = { ...source };
  for (const key of keys) delete result[key];
  return result;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

/** Keys that could modify Object.prototype if copied naively (prototype pollution). */
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively merges plain objects into a new object without mutating the inputs.
 * - nested plain objects are merged; arrays and other values replace the previous value
 * - `undefined` values in overrides are ignored
 * - `__proto__`, `constructor` and `prototype` keys are skipped to prevent prototype pollution
 */
export function deepMerge<T extends object>(base: T, ...overrides: DeepPartial<T>[]): T {
  let result: Record<string, unknown> = mergeTwo({}, base as Record<string, unknown>);
  for (const override of overrides) {
    result = mergeTwo(result, override);
  }
  return result as T;
}

function mergeTwo(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (UNSAFE_KEYS.has(key) || value === undefined) continue;
    const existing = result[key];
    if (isPlainObject(value)) {
      result[key] = mergeTwo(isPlainObject(existing) ? existing : {}, value);
    } else {
      result[key] = Array.isArray(value) ? [...(value as unknown[])] : value;
    }
  }
  return result;
}

/** Splits "a.b[0].c" into ["a", "b", "0", "c"]. */
function toPath(path: string | readonly PropertyKey[]): PropertyKey[] {
  if (typeof path !== 'string') return [...path];
  return path
    .replace(/\[([^\]]+)\]/g, '.$1')
    .split('.')
    .filter((segment) => segment !== '');
}

/**
 * Reads a nested value by path, returning `defaultValue` when any step is missing.
 * @example get({ a: { b: [{ c: 1 }] } }, 'a.b[0].c') // 1
 */
export function get<T = unknown>(
  source: unknown,
  path: string | readonly PropertyKey[],
  defaultValue?: T,
): T | undefined {
  let current: unknown = source;
  for (const key of toPath(path)) {
    if (current === null || current === undefined) return defaultValue;
    current = (current as Record<PropertyKey, unknown>)[key];
  }
  return current === undefined ? defaultValue : (current as T);
}

/** A new object with the same keys and transformed values. */
export function mapValues<T extends object, R>(
  source: T,
  transform: (value: T[keyof T], key: keyof T & string) => R,
): Record<keyof T & string, R> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      transform(value as T[keyof T], key as keyof T & string),
    ]),
  ) as Record<keyof T & string, R>;
}

/**
 * Structural equality for primitives, arrays, plain objects, Dates, RegExps, Maps and Sets.
 * Uses SameValueZero for primitives (NaN equals NaN, 0 equals -0), requires matching
 * prototypes, compares own enumerable keys, and handles circular references. Map keys and
 * Set members are matched by identity.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  return equals(a, b, new WeakMap());
}

function equals(a: unknown, b: unknown, seen: WeakMap<object, WeakSet<object>>): boolean {
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  const compared = seen.get(a) ?? new WeakSet<object>();
  if (compared.has(b)) return true;
  compared.add(b);
  seen.set(a, compared);

  if (a instanceof Date) return a.getTime() === (b as Date).getTime();
  if (a instanceof RegExp) {
    const other = b as RegExp;
    return a.source === other.source && a.flags === other.flags;
  }
  if (a instanceof Map) {
    const other = b as Map<unknown, unknown>;
    if (a.size !== other.size) return false;
    for (const [key, value] of a) {
      if (!other.has(key) || !equals(value, other.get(key), seen)) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    const other = b as Set<unknown>;
    if (a.size !== other.size) return false;
    for (const value of a) if (!other.has(value)) return false;
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.hasOwn(b, key) &&
      equals((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], seen),
  );
}
