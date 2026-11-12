/** Throws a RangeError unless `value` is a finite number. */
export function assertFinite(value: number, name: string): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number, received ${String(value)}`);
  }
}

/** Throws a RangeError unless `value` is an integer within the given minimum. */
export function assertInteger(value: number, name: string, min = Number.MIN_SAFE_INTEGER): void {
  if (!Number.isSafeInteger(value) || value < min) {
    throw new RangeError(`${name} must be an integer >= ${min}, received ${String(value)}`);
  }
}
