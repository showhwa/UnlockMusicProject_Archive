import { wrapFunctionCall } from './fnWrapper';

export async function timedLogger<R = unknown>(label: string, fn: () => Promise<R>): Promise<R> {
  if (import.meta.env.VITE_ENABLE_PERF_LOG !== '1') {
    return fn();
  } else {
    return wrapFunctionCall(
      () => console.time(label),
      () => console.timeEnd(label),
      fn,
    );
  }
}

export async function withGroupedLogs<R = unknown>(label: string, fn: () => Promise<R>): Promise<R> {
  if (import.meta.env.VITE_ENABLE_PERF_LOG !== '1') {
    return fn();
  } else {
    return wrapFunctionCall(
      () => console.group(label),
      () => console.groupEnd(),
      () => timedLogger(`${label}/total`, fn),
    );
  }
}

const noop = (..._args: unknown[]) => {
  // noop
};

const dummyLogger = {
  log: noop,
  info: noop,
  warn: noop,
  debug: noop,
  trace: noop,
};

export function getLogger() {
  if (import.meta.env.VITE_ENABLE_PERF_LOG === '1') {
    return window.console;
  } else {
    return dummyLogger;
  }
}
