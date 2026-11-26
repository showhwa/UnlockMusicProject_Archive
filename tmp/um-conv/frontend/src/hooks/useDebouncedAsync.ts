import { useEffect, useMemo, useRef } from 'react';

export type DebouncedAsyncFn<TArgs extends unknown[]> = {
  (...args: TArgs): void;
  /** Cancel a pending debounced invocation (does not abort an in-flight async call). */
  cancel: () => void;
  /** Cancel pending debounce and invoke immediately with the given args. */
  flush: (...args: TArgs) => void;
};

/**
 * Debounce an async (or sync) callback. Leading calls reset the timer;
 * only the last args run after `waitMs`. Use `flush` to run immediately (e.g. on blur).
 */
export function useDebouncedAsync<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<void>,
  waitMs: number,
): DebouncedAsyncFn<TArgs> {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const api = useMemo(() => {
    const cancel = () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    /** Runs the latest callback; sync throws and async rejections are logged, never propagated. */
    const safeInvoke = async (...args: TArgs): Promise<void> => {
      try {
        await fnRef.current(...args);
      } catch (error) {
        console.error('useDebouncedAsync error', error);
      }
    };

    const run: DebouncedAsyncFn<TArgs> = (...args: TArgs) => {
      cancel();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void safeInvoke(...args);
      }, waitMs);
    };

    run.cancel = cancel;
    run.flush = (...args: TArgs) => {
      cancel();
      void safeInvoke(...args);
    };

    return run;
  }, [waitMs]);

  useEffect(() => () => api.cancel(), [api]);

  return api;
}
