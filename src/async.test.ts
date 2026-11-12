import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  debounce,
  mapWithConcurrency,
  retry,
  sleep,
  throttle,
  TimeoutError,
  withTimeout,
} from './async.js';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('sleep', () => {
  it('resolves after the delay', async () => {
    const done = vi.fn();
    void sleep(100).then(done);
    await vi.advanceTimersByTimeAsync(99);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalled();
  });

  it('rejects when aborted, before or during the wait', async () => {
    const controller = new AbortController();
    const pending = sleep(1000, { signal: controller.signal });
    controller.abort(new Error('stop'));
    await expect(pending).rejects.toThrow('stop');

    await expect(sleep(10, { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });
});

describe('withTimeout', () => {
  it('resolves when the promise settles in time', async () => {
    const result = withTimeout(Promise.resolve('ok'), 100);
    await expect(result).resolves.toBe('ok');
  });

  it('rejects with a TimeoutError otherwise', async () => {
    const result = withTimeout(new Promise(() => {}), 100);
    const assertion = expect(result).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;

    const custom = expect(withTimeout(new Promise(() => {}), 0, 'Too slow')).rejects.toThrow(
      'Too slow',
    );
    await vi.advanceTimersByTimeAsync(0);
    await custom;
  });
});

describe('retry', () => {
  it('retries with exponential backoff until success', async () => {
    const delays: number[] = [];
    const operation = vi
      .fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('done');

    const result = retry(operation, {
      delay: 100,
      onRetry: (_error, _attempt, delay) => delays.push(delay),
    });
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe('done');
    expect(operation).toHaveBeenCalledTimes(3);
    expect(operation).toHaveBeenLastCalledWith(3);
    expect(delays).toEqual([100, 200]);
  });

  it('gives up after the configured retries and rethrows the last error', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('always'));
    const result = retry(operation, { retries: 2, delay: 10 });
    const assertion = expect(result).rejects.toThrow('always');
    await vi.runAllTimersAsync();
    await assertion;
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('respects shouldRetry and maxDelay', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('fatal'));
    await expect(retry(operation, { shouldRetry: () => false })).rejects.toThrow('fatal');
    expect(operation).toHaveBeenCalledTimes(1);

    const delays: number[] = [];
    const capped = retry(vi.fn().mockRejectedValue(new Error('x')), {
      retries: 3,
      delay: 1000,
      factor: 10,
      maxDelay: 5000,
      onRetry: (_e, _a, delay) => delays.push(delay),
    });
    const assertion = expect(capped).rejects.toThrow('x');
    await vi.runAllTimersAsync();
    await assertion;
    expect(delays).toEqual([1000, 5000, 5000]);
  });

  it('stops when aborted', async () => {
    await expect(retry(() => 'never', { signal: AbortSignal.abort() })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('validates options', async () => {
    await expect(retry(() => 1, { retries: -1 })).rejects.toThrow(RangeError);
  });
});

describe('debounce', () => {
  it('runs once with the latest arguments after a quiet period', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced('a');
    vi.advanceTimersByTime(50);
    debounced('b');
    expect(debounced.pending()).toBe(true);
    vi.advanceTimersByTime(99);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith('b');
    expect(debounced.pending()).toBe(false);
  });

  it('supports cancel and flush', () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);
    debounced(1);
    debounced.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).not.toHaveBeenCalled();

    debounced(2);
    debounced.flush();
    expect(fn).toHaveBeenCalledWith(2);
    debounced.flush();
    expect(fn).toHaveBeenCalledOnce();
  });
});

describe('throttle', () => {
  it('runs immediately, then once at the end of the window with the latest arguments', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    throttled(2);
    throttled(3);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenLastCalledWith(1);
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith(3);
    vi.advanceTimersByTime(100);
    throttled(4);
    expect(fn).toHaveBeenLastCalledWith(4);
  });

  it('can cancel a pending trailing call', () => {
    const fn = vi.fn();
    const throttled = throttle(fn, 100);
    throttled(1);
    throttled(2);
    throttled.cancel();
    vi.advanceTimersByTime(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('mapWithConcurrency', () => {
  it('limits concurrency and keeps input order', async () => {
    let running = 0;
    let peak = 0;
    const result = mapWithConcurrency(
      [30, 10, 20, 5],
      async (ms, index) => {
        running += 1;
        peak = Math.max(peak, running);
        await sleep(ms);
        running -= 1;
        return `${index}:${ms}`;
      },
      2,
    );
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual(['0:30', '1:10', '2:20', '3:5']);
    expect(peak).toBe(2);
  });

  it('rejects with the first error and stops starting new work', async () => {
    const started: number[] = [];
    const result = mapWithConcurrency(
      [1, 2, 3, 4],
      async (n) => {
        started.push(n);
        await sleep(10);
        if (n === 1) throw new Error('boom');
        return n;
      },
      1,
    );
    const assertion = expect(result).rejects.toThrow('boom');
    await vi.runAllTimersAsync();
    await assertion;
    expect(started).toEqual([1]);
  });

  it('handles empty input and validates concurrency', async () => {
    await expect(mapWithConcurrency([], (x) => x)).resolves.toEqual([]);
    await expect(mapWithConcurrency([1], (x) => x, 0)).rejects.toThrow(RangeError);
  });
});
