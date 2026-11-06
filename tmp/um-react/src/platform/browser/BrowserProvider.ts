import { AndroidImportType, type NativeImportType } from '~/platform/capabilities';
import { NotSupportedMethod, PlatformNotInitializedError } from '~/platform/errors';
import type { PlatformProvider } from '~/platform/PlatformProvider';
import type { AndroidAdbImportOptions, NativeImportResult, PlatformCapabilities } from '~/platform/types';
import { createBrowserDownload, type BrowserDownload } from './browserDownload';
import { loadDecryptWorkerCrypto, type BrowserCrypto } from './browserCrypto';
import { createBrowserSettingsIo, DEFAULT_SETTINGS_STORAGE_KEY, type SettingsStorage } from './browserSettingsIo';
import { detectBrowserDownloadTypes } from './detectDownloadCapabilities';

function notSupported(capability: string): Promise<never> {
  return Promise.reject(new NotSupportedMethod(capability));
}

export interface BrowserProviderOptions {
  /** Defaults to `localStorage`. Injected in tests. */
  settingsStorage?: SettingsStorage;
  /** Defaults to `um-react-settings`. */
  settingsStorageKey?: string;
  /**
   * Injected crypto backend (tests). When set, `crypto.*` works without loading the worker
   * and `init()` resolves immediately.
   */
  crypto?: BrowserCrypto;
  /** Defaults to dynamic-importing decrypt-worker/client. Injected in tests. */
  loadCrypto?: () => Promise<BrowserCrypto>;
  /** Override download backend (tests). Defaults to FS Access / ZIP helpers. */
  download?: BrowserDownload;
  /** Override detected `downloadTypes` (tests). */
  downloadTypes?: PlatformCapabilities['downloadTypes'];
  /** Override `directFsAccess` (tests). Browser default is `false`. */
  directFsAccess?: boolean;
  /** Override `nativeKeyAccess` (tests). Browser default is `[]`. */
  nativeKeyAccess?: PlatformCapabilities['nativeKeyAccess'];
  /** Override `androidKeyAccess` (tests). Browser default is `None`. */
  androidKeyAccess?: PlatformCapabilities['androidKeyAccess'];
  /** Override `keys` backend (tests). Defaults to `NotSupportedMethod` for both methods. */
  keys?: PlatformProvider['keys'];
}

/**
 * In-browser `PlatformProvider`.
 * Capabilities follow runtime File System Access / save-picker probing (`directFsAccess: false`).
 * `settings` persists production settings via localStorage (or injected storage).
 * `crypto` binds to the decrypt worker only inside `init()` (dynamic import; no construct-time Worker).
 * `download` delegates to anchor / directory picker / streaming ZIP / pack ZIP helpers.
 * Native and ADB key import throw `NotSupportedMethod` (`nativeKeyAccess` empty, `androidKeyAccess` None).
 */
export function createBrowserProvider(options: BrowserProviderOptions = {}): PlatformProvider {
  const downloadTypes = Object.freeze(
    options.downloadTypes ? [...options.downloadTypes] : detectBrowserDownloadTypes(),
  );
  const capabilities: PlatformCapabilities = Object.freeze({
    downloadTypes,
    directFsAccess: options.directFsAccess ?? false,
    androidKeyAccess: options.androidKeyAccess ?? AndroidImportType.None,
    nativeKeyAccess: Object.freeze(options.nativeKeyAccess ? [...options.nativeKeyAccess] : ([] as NativeImportType[])),
  });

  const settingsIo = createBrowserSettingsIo(
    options.settingsStorage ?? localStorage,
    options.settingsStorageKey ?? DEFAULT_SETTINGS_STORAGE_KEY,
  );

  const download = options.download ?? createBrowserDownload(downloadTypes);

  const loadCrypto = options.loadCrypto ?? loadDecryptWorkerCrypto;
  let backend: BrowserCrypto | null = options.crypto ?? null;
  let initPromise: Promise<void> | null = options.crypto ? Promise.resolve() : null;

  async function requireBackend(capability: string): Promise<BrowserCrypto> {
    if (backend) {
      return backend;
    }
    if (initPromise) {
      await initPromise;
      if (backend) {
        return backend;
      }
    }
    throw new PlatformNotInitializedError(capability);
  }

  const crypto: BrowserCrypto = {
    request: (action, payload) => requireBackend('crypto.request').then((api) => api.request(action, payload)),
    enqueueDecrypt: (payload, onPreProcess) =>
      requireBackend('crypto.enqueueDecrypt').then((api) => api.enqueueDecrypt(payload, onPreProcess)),
  };

  return {
    id: 'browser',
    capabilities,

    init(): Promise<void> {
      if (!initPromise) {
        initPromise = loadCrypto().then((loaded) => {
          backend = loaded;
        });
      }
      return initPromise;
    },

    crypto,

    settings: {
      load: () => settingsIo.load(),
      save: (settings) => settingsIo.save(settings),
    },

    download,

    keys: options.keys ?? {
      importNative: (_targets: readonly NativeImportType[]): Promise<NativeImportResult> =>
        notSupported('keys.importNative'),
      importAndroidAdb: (_opts: AndroidAdbImportOptions): Promise<NativeImportResult> =>
        notSupported('keys.importAndroidAdb'),
    },
  };
}
