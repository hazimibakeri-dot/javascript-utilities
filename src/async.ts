import { assertFinite, assertInteger } from './internal.js';

/** Thrown by `withTimeout` when the time limit is reached. */
export class TimeoutError extends Error {
  override name = 'TimeoutError';
}

function abortReason(signal: AbortSignal): Error {
  return signal.reason instanceof Error
    ? signal.reason
    : new DOMException('This operation was aborted', 'AbortError');
}

/**
 * Resolves after `ms` milliseconds. Rejects early with the signal's reason if aborted.
 * @example await sleep(500, { signal: controller.signal });
 */
export function sleep(ms: number, options: { signal?: AbortSignal } = {}): Promise<void> {
  assertFinite(ms, 'ms');
  const { signal } = options;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortReason(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortReason(signal!));
    };
    const timer = setTimeout(
      () => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
      },
      Math.max(0, ms),
    );
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Rejects with a TimeoutError if `promise` does not settle within `ms`. The underlying work
 * is not cancelled; pass an AbortSignal (for example `AbortSignal.timeout(ms)` with fetch)
 * when the operation supports it.
 */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number, message?: string): Promise<T> {
  assertFinite(ms, 'ms');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message ?? `Timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface RetryOptions {
  /** Retries after the first attempt (total attempts = retries + 1). Defaults to 3. */
  retries?: number;
  /** Delay before the first retry in ms. Defaults to 200. */
  delay?: number;
  /** Multiplier applied to the delay after each retry. Defaults to 2 (exponential backoff). */
  factor?: number;
  /** Upper bound for the delay in ms. Defaults to 10 000. */
  maxDelay?: number;
  /** Return false to stop retrying, e.g. for 4xx responses. Defaults to always retrying. */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  /** Called before waiting for the next attempt. */
  onRetry?: (error: unknown, attempt: number, delay: number) => void;
  /** Stops retrying (and any pending wait) when aborted. */
  signal?: AbortSignal;
}

/**
 * Calls `operation` until it succeeds, waiting longer between attempts. Rethrows the last
 * error when retries run out or `shouldRetry` returns false.
 */
export async function retry<T>(
  operation: (attempt: number) => T | PromiseLike<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = 3,
    delay = 200,
    factor = 2,
    maxDelay = 10_000,
    shouldRetry = () => true,
    onRetry,
    signal,
  } = options;
  assertInteger(retries, 'retries', 0);
  assertFinite(delay, 'delay');
  assertFinite(factor, 'factor');

  for (let attempt = 1; ; attempt += 1) {
    if (signal?.aborted) throw abortReason(signal);
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;
      const wait = Math.min(delay * factor ** (attempt - 1), maxDelay);
      onRetry?.(error, attempt, wait);
      await sleep(wait, { signal });
    }
  }
}

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  /** Drops a pending call. */
  cancel(): void;
  /** Runs a pending call immediately. */
  flush(): void;
  /** Whether a call is waiting. */
  pending(): boolean;
}

/**
 * Delays calls until `wait` ms have passed without another call, then runs the latest one.
 * Useful for search-as-you-type. The wrapper does not preserve `this`.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): Debounced<Args> {
  assertFinite(wait, 'wait');
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastArgs: Args | undefined;

  const invoke = () => {
    const args = lastArgs;
    timer = undefined;
    lastArgs = undefined;
    if (args) fn(...args);
  };

  const debounced = (...args: Args) => {
    lastArgs = args;
    clearTimeout(timer);
    timer = setTimeout(invoke, wait);
  };
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  debounced.flush = () => {
    if (timer === undefined) return;
    clearTimeout(timer);
    invoke();
  };
  debounced.pending = () => timer !== undefined;
  return debounced;
}

export interface Throttled<Args extends unknown[]> {
  (...args: Args): void;
  /** Drops a pending trailing call. */
  cancel(): void;
}

/**
 * Runs at most once per `wait` ms: immediately on the first call, then once more at the end
 * of the window with the latest arguments. Useful for scroll and resize handlers.
 */
export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): Throttled<Args> {
  assertFinite(wait, 'wait');
  let lastRun = Number.NEGATIVE_INFINITY;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingArgs: Args | undefined;

  const run = (args: Args) => {
    lastRun = Date.now();
    fn(...args);
  };

  const throttled = (...args: Args) => {
    const remaining = wait - (Date.now() - lastRun);
    if (remaining <= 0) {
      clearTimeout(timer);
      timer = undefined;
      pendingArgs = undefined;
      run(args);
      return;
    }
    pendingArgs = args;
    timer ??= setTimeout(() => {
      timer = undefined;
      const latest = pendingArgs;
      pendingArgs = undefined;
      if (latest) run(latest);
    }, remaining);
  };
  throttled.cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pendingArgs = undefined;
  };
  return throttled;
}

/**
 * Maps items with an async function, running at most `concurrency` calls at once and
 * returning results in input order. Rejects with the first error; no new calls start after
 * that, but calls already running are not cancelled.
 */
export async function mapWithConcurrency<T, R>(
  items: Iterable<T>,
  mapper: (item: T, index: number) => R | PromiseLike<R>,
  concurrency = 4,
): Promise<R[]> {
  assertInteger(concurrency, 'concurrency', 1);
  const list = Array.from(items);
  const results = new Array<R>(list.length);
  let nextIndex = 0;
  let failed = false;

  async function worker(): Promise<void> {
    while (!failed && nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await mapper(list[index] as T, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return results;
}
