// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DroppedItem } from '~protocol';

type Listener = (event: { data?: unknown }) => void;

const runtime = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  off: vi.fn(),
}));

// Keep the real runtime (generated models use `Create`); only intercept event subscription.
vi.mock('@wailsio/runtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@wailsio/runtime')>();
  return {
    ...actual,
    Events: {
      ...actual.Events,
      On: (name: string, listener: Listener) => {
        runtime.listeners.set(name, listener);
        return runtime.off;
      },
    },
  };
});

import { useFileDropRouter } from '@/hooks/useFileDropRouter';
import { registerFileDropHandler } from '@/lib/fileDrop';

describe('useFileDropRouter', () => {
  beforeEach(() => {
    runtime.listeners.clear();
    runtime.off.mockClear();
  });

  it('subscribes to the generated files:dropped event and hydrates the payload', () => {
    const handler = vi.fn();
    const unregister = registerFileDropHandler('file-list-1', handler);
    renderHook(() => useFileDropRouter());

    const listener = runtime.listeners.get('files:dropped');
    expect(listener).toBeTypeOf('function');
    listener?.({
      data: { targetId: 'file-list-1', items: [{ path: 'C:/a.ncm', isDir: false }] },
    });

    expect(handler).toHaveBeenCalledTimes(1);
    const [items] = handler.mock.calls[0];
    expect(items).toEqual([{ path: 'C:/a.ncm', isDir: false }]);
    expect(items).toHaveLength(1);
    for (const item of items) expect(item).toBeInstanceOf(DroppedItem);
    unregister();
  });

  it('ignores events without data and unsubscribes on unmount', () => {
    const handler = vi.fn();
    const unregister = registerFileDropHandler('file-list-2', handler);
    const { unmount } = renderHook(() => useFileDropRouter());

    runtime.listeners.get('files:dropped')?.({});
    expect(handler).not.toHaveBeenCalled();

    unmount();
    expect(runtime.off).toHaveBeenCalledTimes(1);
    unregister();
  });
});
