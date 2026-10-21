/** True when the user cancelled a File System Access picker (or similar AbortError). */
export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}
