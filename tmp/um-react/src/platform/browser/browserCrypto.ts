import type { WorkerActionMap, WorkerActionName } from '~/decrypt-worker/actions';
import type { DecryptionResult } from '~/decrypt-worker/constants';
import type { DecryptCommandPayload } from '~/decrypt-worker/types';
import type { PlatformProvider } from '~/platform/PlatformProvider';

export type BrowserCrypto = PlatformProvider['crypto'];

/**
 * Lazily binds to decrypt-worker after a dynamic import.
 * This module must not statically import `~/decrypt-worker/client` (Worker side effect).
 */
export async function loadDecryptWorkerCrypto(): Promise<BrowserCrypto> {
  const { decryptionQueue, workerClientBus } = await import('~/decrypt-worker/client');

  return {
    request<K extends WorkerActionName>(
      action: K,
      payload: WorkerActionMap[K]['req'],
    ): Promise<WorkerActionMap[K]['res']> {
      return workerClientBus.request(action, payload);
    },
    enqueueDecrypt(payload: DecryptCommandPayload, onPreProcess?: () => void): Promise<DecryptionResult> {
      return decryptionQueue.add(payload, onPreProcess);
    },
  };
}
