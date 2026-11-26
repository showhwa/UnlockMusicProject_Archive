import { afterEach, describe, expect, it, vi } from 'vitest';
import { DroppedItem, FilesDroppedPayload } from '~protocol';
import {
  dispatchFileDrop,
  firstDirectoryPath,
  firstFilePath,
  registerFileDropHandler,
} from '@/lib/fileDrop';

const dir = new DroppedItem({ path: 'C:/music', isDir: true });
const file = new DroppedItem({ path: 'C:/music/a.ncm', isDir: false });

describe('fileDrop', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    cleanups.splice(0).forEach((fn) => fn());
  });

  it('dispatches items to the handler registered for the target id', () => {
    const handler = vi.fn();
    const other = vi.fn();
    cleanups.push(registerFileDropHandler('target-a', handler));
    cleanups.push(registerFileDropHandler('target-b', other));

    dispatchFileDrop(new FilesDroppedPayload({ targetId: 'target-a', items: [file] }));

    expect(handler).toHaveBeenCalledWith([file]);
    expect(other).not.toHaveBeenCalled();
  });

  it('ignores payloads without a target or items and unknown targets', () => {
    const handler = vi.fn();
    cleanups.push(registerFileDropHandler('target-a', handler));

    dispatchFileDrop(new FilesDroppedPayload({ targetId: '', items: [file] }));
    dispatchFileDrop(new FilesDroppedPayload({ targetId: 'target-a', items: [] }));
    dispatchFileDrop(new FilesDroppedPayload({ targetId: 'missing', items: [file] }));

    expect(handler).not.toHaveBeenCalled();
  });

  it('only unregisters the handler that was registered', () => {
    const first = vi.fn();
    const second = vi.fn();
    const offFirst = registerFileDropHandler('target-a', first);
    cleanups.push(registerFileDropHandler('target-a', second));

    // A stale cleanup must not remove the newer handler for the same id.
    offFirst();
    dispatchFileDrop(new FilesDroppedPayload({ targetId: 'target-a', items: [file] }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('picks the first directory or file path', () => {
    expect(firstDirectoryPath([file, dir])).toBe('C:/music');
    expect(firstFilePath([dir, file])).toBe('C:/music/a.ncm');
    expect(firstDirectoryPath([file])).toBeUndefined();
    expect(firstFilePath([dir])).toBeUndefined();
  });
});
