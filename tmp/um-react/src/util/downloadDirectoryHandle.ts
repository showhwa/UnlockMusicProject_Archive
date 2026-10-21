import { get, set, del } from 'idb-keyval';
import { isAbortError } from '~/util/fsPicker';

const DIRECTORY_HANDLE_KEY = 'um-react-batch-download-dir';

export async function getRememberedDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await get<FileSystemDirectoryHandle>(DIRECTORY_HANDLE_KEY);
    return handle ?? null;
  } catch {
    return null;
  }
}

export async function setRememberedDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await set(DIRECTORY_HANDLE_KEY, handle);
}

export async function clearRememberedDirectoryHandle(): Promise<void> {
  await del(DIRECTORY_HANDLE_KEY);
}

export async function hasRememberedDirectoryHandle(): Promise<boolean> {
  return (await getRememberedDirectoryHandle()) !== null;
}

export async function verifyDirectoryPermission(
  handle: FileSystemDirectoryHandle,
  mode: FileSystemPermissionMode = 'readwrite',
): Promise<boolean> {
  const opts: FileSystemHandlePermissionDescriptor = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') {
    return true;
  }
  if ((await handle.requestPermission(opts)) === 'granted') {
    return true;
  }
  return false;
}

/**
 * Resolve a writable directory: remembered handle (if allowed) → picker.
 * Returns null when the user cancels the picker.
 */
export async function resolveWritableDirectory(remember: boolean): Promise<FileSystemDirectoryHandle | null> {
  if (remember) {
    const remembered = await getRememberedDirectoryHandle();
    if (remembered && (await verifyDirectoryPermission(remembered))) {
      return remembered;
    }
  }

  try {
    const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
    if (remember) {
      await setRememberedDirectoryHandle(dir);
    }
    return dir;
  } catch (e) {
    if (isAbortError(e)) {
      return null;
    }
    throw e;
  }
}
