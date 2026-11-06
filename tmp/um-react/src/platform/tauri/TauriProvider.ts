import { AndroidImportType, BatchDownloadType, NativeImportType } from '~/platform/capabilities';
import { NotImplementedError, NotSupportedMethod } from '~/platform/errors';
import type { PlatformProvider } from '~/platform/PlatformProvider';
import type {
  AndroidAdbImportOptions,
  DownloadManyInput,
  DownloadOneInput,
  NativeImportResult,
  PlatformCapabilities,
} from '~/platform/types';

/** Target capability set for the desktop/native shell (methods not wired yet). */
export const DEFAULT_TAURI_CAPABILITIES: PlatformCapabilities = Object.freeze({
  // Native uses DirectWrite (`directFsAccess`); no browser-style batch/ZIP download modes.
  downloadTypes: Object.freeze([] as BatchDownloadType[]),
  directFsAccess: true,
  androidKeyAccess: AndroidImportType.Adb,
  nativeKeyAccess: Object.freeze([
    NativeImportType.QQMusic,
    NativeImportType.Kuwo,
    NativeImportType.Kugou,
    NativeImportType.QingTing,
  ]),
});

function notImplemented(capability: string): Promise<never> {
  return Promise.reject(new NotImplementedError(capability));
}

function notSupported(capability: string, message?: string): Promise<never> {
  return Promise.reject(new NotSupportedMethod(capability, message));
}

export interface TauriProviderOptions {
  /** Override declared capabilities (tests / partial shells). */
  capabilities?: PlatformCapabilities;
}

/**
 * Native (Tauri) `PlatformProvider` stub.
 * Declares desktop target capabilities; every method exists, but declared backends throw
 * `NotImplementedError` until native commands are wired. Calls outside `capabilities`
 * throw `NotSupportedMethod`. Construction and `init()` have no side effects.
 */
export function createTauriProvider(options: TauriProviderOptions = {}): PlatformProvider {
  const source = options.capabilities ?? DEFAULT_TAURI_CAPABILITIES;
  const capabilities: PlatformCapabilities = Object.freeze({
    downloadTypes: Object.freeze([...source.downloadTypes]),
    directFsAccess: source.directFsAccess,
    androidKeyAccess: source.androidKeyAccess,
    nativeKeyAccess: Object.freeze([...source.nativeKeyAccess]),
  });

  const downloadTypeSet = new Set(capabilities.downloadTypes);
  const nativeAccessSet = new Set(capabilities.nativeKeyAccess);

  return {
    id: 'tauri',
    capabilities,

    init(): Promise<void> {
      return Promise.resolve();
    },

    crypto: {
      request: (_action, _payload) => notImplemented('crypto.request'),
      enqueueDecrypt: (_payload, _onPreProcess) => notImplemented('crypto.enqueueDecrypt'),
    },

    settings: {
      load: () => notImplemented('settings.load'),
      save: (_settings) => notImplemented('settings.save'),
    },

    download: {
      saveOne: (_input: DownloadOneInput) => {
        if (downloadTypeSet.size === 0) {
          return notSupported('download.saveOne');
        }
        return notImplemented('download.saveOne');
      },

      saveMany: (type: BatchDownloadType, _input: DownloadManyInput) => {
        if (!downloadTypeSet.has(type)) {
          return notSupported('download.saveMany', `${type} unavailable on this platform`);
        }
        return notImplemented(`download.saveMany.${type}`);
      },

      pickDirectory: () => {
        if (!capabilities.directFsAccess) {
          return notSupported('download.pickDirectory');
        }
        return notImplemented('download.pickDirectory');
      },
    },

    keys: {
      importNative: (targets: readonly NativeImportType[]) => {
        if (nativeAccessSet.size === 0) {
          return notSupported('keys.importNative');
        }
        if (targets.length === 0) {
          return notSupported('keys.importNative', 'No native import targets selected');
        }
        const unsupported = targets.filter((t) => !nativeAccessSet.has(t));
        if (unsupported.length > 0) {
          return notSupported('keys.importNative', `Unsupported native import target(s): ${unsupported.join(', ')}`);
        }
        return notImplemented('keys.importNative');
      },

      importAndroidAdb: (_opts: AndroidAdbImportOptions): Promise<NativeImportResult> => {
        if (capabilities.androidKeyAccess !== AndroidImportType.Adb) {
          return notSupported('keys.importAndroidAdb');
        }
        return notImplemented('keys.importAndroidAdb');
      },
    },
  };
}
