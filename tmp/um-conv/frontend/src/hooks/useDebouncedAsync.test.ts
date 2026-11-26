// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedAsync } from '@/hooks/useDebouncedAsync';

describe('useDebouncedAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs only the last call after the wait', async () => {
    const fn = vi.fn(async (_value: string) => undefined);
    const { result } = renderHook(() => useDebouncedAsync(fn, 100));

    result.current('a');
    result.current('b');
    await vi.advanceTimersByTimeAsync(99);
    expect(fn).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
  });

  it('flush cancels the pending timer and invokes immediately', async () => {
    const fn = vi.fn(async (_value: string) => undefined);
    const { result } = renderHook(() => useDebouncedAsync(fn, 100));

    result.current('pending');
    result.current.flush('now');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('now');

    await vi.advanceTimersByTimeAsync(200);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  // Vitest fails the run on unhandled rejections, so this also guards against them.
  it('logs a rejected flush instead of leaving an unhandled rejection', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('boom');
    const fn = vi.fn(async () => {
      throw failure;
    });

    const { result } = renderHook(() => useDebouncedAsync(fn, 100));
    result.current.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(error).toHaveBeenCalledWith('useDebouncedAsync error', failure);
  });

  it('logs a synchronous throw from flush', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('sync boom');
    const fn = vi.fn((): Promise<void> => {
      throw failure;
    });

    const { result } = renderHook(() => useDebouncedAsync(fn, 100));
    expect(() => result.current.flush()).not.toThrow();
    await vi.advanceTimersByTimeAsync(0);
    expect(error).toHaveBeenCalledWith('useDebouncedAsync error', failure);
  });

  it('logs a rejected timer invocation', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('timer boom');
    const fn = vi.fn(async () => {
      throw failure;
    });

    const { result } = renderHook(() => useDebouncedAsync(fn, 50));
    result.current();
    await vi.advanceTimersByTimeAsync(50);
    expect(error).toHaveBeenCalledWith('useDebouncedAsync error', failure);
  });

  it('cancels a pending call on unmount', async () => {
    const fn = vi.fn(async () => undefined);
    const { result, unmount } = renderHook(() => useDebouncedAsync(fn, 100));

    result.current();
    unmount();
    await vi.advanceTimersByTimeAsync(200);
    expect(fn).not.toHaveBeenCalled();
  });
});
