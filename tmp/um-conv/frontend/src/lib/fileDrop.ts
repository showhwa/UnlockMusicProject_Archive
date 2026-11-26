import type { DroppedItem, FilesDroppedPayload } from '~protocol';

export const DropTargetIds = {
  fileList: 'file-list',
  pathOutputDir: 'path-output-dir',
  pathTempDir: 'path-temp-dir',
  pathFfmpeg: 'path-ffmpeg',
  pathUmCliRs: 'path-um-cli-rs',
  pathQmpc: 'path-qmpc',
  pathAdb: 'path-adb',
} as const;

export type DropTargetId = (typeof DropTargetIds)[keyof typeof DropTargetIds];

export type FileDropHandler = (items: DroppedItem[]) => void;

const handlers = new Map<string, FileDropHandler>();

/** Register a handler for a drop target id. Returns an unregister function. */
export function registerFileDropHandler(targetId: string, handler: FileDropHandler): () => void {
  handlers.set(targetId, handler);
  return () => {
    if (handlers.get(targetId) === handler) {
      handlers.delete(targetId);
    }
  };
}

export function dispatchFileDrop(payload: FilesDroppedPayload): void {
  if (!payload.targetId || !payload.items?.length) return;
  handlers.get(payload.targetId)?.(payload.items);
}

/** First directory path, if any. */
export function firstDirectoryPath(items: DroppedItem[]): string | undefined {
  return items.find((item) => item.isDir)?.path;
}

/** First non-directory file path, if any. */
export function firstFilePath(items: DroppedItem[]): string | undefined {
  return items.find((item) => !item.isDir)?.path;
}
