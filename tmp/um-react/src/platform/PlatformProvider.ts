import type { WorkerActionMap, WorkerActionName } from '~/decrypt-worker/actions';
import type { DecryptionResult } from '~/decrypt-worker/constants';
import type { DecryptCommandPayload } from '~/decrypt-worker/types';
import type { ProductionSettings } from '~/features/settings/settingsSlice';
import type { BatchDownloadType, NativeImportType } from './capabilities';
import type {
  AndroidAdbImportOptions,
  DownloadManyInput,
  DownloadManyResult,
  DownloadOneInput,
  NativeImportResult,
  PlatformCapabilities,
} from './types';

/**
 * Platform backend for crypto, settings IO, download, and native key import.
 *
 * Conventions:
 * - Every provider implements **all** methods; never omit methods or silently no-op.
 * - Capability missing / platform will never support → `NotSupportedMethod`.
 * - Declared / planned but not wired yet (stub) → `NotImplementedError`.
 * - Heavy backends (e.g. decrypt worker) load only inside `init()`; constructing the provider
 *   and reading `crypto` must not create a Worker or fetch the worker chunk.
 * - `capabilities` is the only UI switch source; UI must not call `supportsDirectoryPicker()` etc.
 *   (those helpers stay for BrowserProvider internal capability detection).
 */
export interface PlatformProvider {
  readonly id: 'browser' | 'tauri';
  readonly capabilities: PlatformCapabilities;

  /**
   * One-shot async setup (idempotent). Browser: dynamically import decrypt-worker/client and create Worker.
   * Must complete before the first successful `crypto.request` / `enqueueDecrypt` (unless a test injects crypto).
   * May run in parallel with `settings.load`.
   */
  init(): Promise<void>;

  /**
   * RPC aligned with `WorkerActionMap`; UI should not import `decrypt-worker/client`.
   * Obtaining this object has no side effects (no Worker).
   */
  crypto: {
    request<K extends WorkerActionName>(
      action: K,
      payload: WorkerActionMap[K]['req'],
    ): Promise<WorkerActionMap[K]['res']>;
    enqueueDecrypt(payload: DecryptCommandPayload, onPreProcess?: () => void): Promise<DecryptionResult>;
  };

  settings: {
    load(): Promise<ProductionSettings | null>;
    save(settings: ProductionSettings): Promise<void>;
  };

  download: {
    /** Single file; no suitable download capability → `NotSupportedMethod`. */
    saveOne(input: DownloadOneInput): Promise<void>;
    /**
     * Batch; `type` ∉ `capabilities.downloadTypes` → `NotSupportedMethod`.
     * Declared type not wired yet → `NotImplementedError`.
     */
    saveMany(type: BatchDownloadType, input: DownloadManyInput): Promise<DownloadManyResult>;
    /**
     * Native folder picker for DirectWrite `fixedDirectoryPath`.
     * Resolves to an absolute path, or `null` if the user cancels.
     * `!capabilities.directFsAccess` → `NotSupportedMethod` (browsers cannot expose OS paths).
     * Declared but not wired (stub) → `NotImplementedError`.
     */
    pickDirectory(): Promise<string | null>;
  };

  keys: {
    /** Empty / unsupported `nativeKeyAccess` → `NotSupportedMethod`. */
    importNative(targets: readonly NativeImportType[]): Promise<NativeImportResult>;
    /** `androidKeyAccess !== Adb` → `NotSupportedMethod`. */
    importAndroidAdb(opts: AndroidAdbImportOptions): Promise<NativeImportResult>;
  };
}
