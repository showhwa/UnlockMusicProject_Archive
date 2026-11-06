import { AndroidImportType, BatchDownloadType, NativeImportType } from '~/platform/capabilities';
import { createPlatformProvider } from '~/platform/createPlatformProvider';
import { detectPlatformRuntime } from '~/platform/detectPlatform';
import { NotImplementedError, NotSupportedMethod } from '~/platform/errors';
import { createTauriProvider, DEFAULT_TAURI_CAPABILITIES } from '~/platform/tauri/TauriProvider';
import type { PlatformCapabilities } from '~/platform/types';

function expectNotImplemented(err: unknown, capability: string): boolean {
  return err instanceof NotImplementedError && err.code === 'NOT_IMPLEMENTED' && err.capability === capability;
}

function expectNotSupported(err: unknown, capability: string): boolean {
  return err instanceof NotSupportedMethod && err.code === 'NOT_SUPPORTED' && err.capability === capability;
}

const emptyCaps: PlatformCapabilities = {
  downloadTypes: [],
  directFsAccess: false,
  androidKeyAccess: AndroidImportType.None,
  nativeKeyAccess: [],
};

describe('TauriProvider stub', () => {
  test('declares target desktop capabilities', () => {
    const provider = createTauriProvider();

    expect(provider.id).toBe('tauri');
    expect(provider.capabilities).toEqual(DEFAULT_TAURI_CAPABILITIES);
    expect(provider.capabilities.directFsAccess).toBe(true);
    expect(provider.capabilities.androidKeyAccess).toBe(AndroidImportType.Adb);
    expect(provider.capabilities.nativeKeyAccess).toEqual([
      NativeImportType.QQMusic,
      NativeImportType.Kuwo,
      NativeImportType.Kugou,
      NativeImportType.QingTing,
    ]);
    expect(provider.capabilities.downloadTypes).toEqual([]);
  });

  test('exposes every PlatformProvider method', () => {
    const provider = createTauriProvider();

    expect(typeof provider.init).toBe('function');
    expect(typeof provider.crypto.request).toBe('function');
    expect(typeof provider.crypto.enqueueDecrypt).toBe('function');
    expect(typeof provider.settings.load).toBe('function');
    expect(typeof provider.settings.save).toBe('function');
    expect(typeof provider.download.saveOne).toBe('function');
    expect(typeof provider.download.saveMany).toBe('function');
    expect(typeof provider.download.pickDirectory).toBe('function');
    expect(typeof provider.keys.importNative).toBe('function');
    expect(typeof provider.keys.importAndroidAdb).toBe('function');
  });

  test('init resolves without side effects and is idempotent', async () => {
    const provider = createTauriProvider();
    await expect(Promise.all([provider.init(), provider.init()])).resolves.toEqual([undefined, undefined]);
    await expect(provider.init()).resolves.toBeUndefined();
  });

  test('declared backends throw NotImplementedError', async () => {
    const provider = createTauriProvider();

    await expect(provider.crypto.request('VERSION', null)).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'crypto.request'),
    );
    await expect(
      provider.crypto.enqueueDecrypt({
        fileId: 'file://1',
        blobURI: 'blob://in',
        options: { fileName: 'a.bin' },
      }),
    ).rejects.toSatisfy((err: unknown) => expectNotImplemented(err, 'crypto.enqueueDecrypt'));

    await expect(provider.settings.load()).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'settings.load'),
    );
    await expect(provider.settings.save({} as never)).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'settings.save'),
    );

    await expect(provider.download.pickDirectory()).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'download.pickDirectory'),
    );

    await expect(provider.keys.importNative([NativeImportType.QQMusic])).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'keys.importNative'),
    );
    await expect(provider.keys.importAndroidAdb({})).rejects.toSatisfy((err: unknown) =>
      expectNotImplemented(err, 'keys.importAndroidAdb'),
    );
  });

  test('empty downloadTypes reject batch/single download with NotSupportedMethod', async () => {
    const provider = createTauriProvider();

    await expect(provider.download.saveOne({ url: 'blob:x', fileName: 'a.flac' })).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'download.saveOne'),
    );
    await expect(
      provider.download.saveMany(BatchDownloadType.PackZip, {
        files: [{ url: 'blob:x', fileName: 'a.flac' }],
      }),
    ).rejects.toSatisfy((err: unknown) => expectNotSupported(err, 'download.saveMany'));
    await expect(
      provider.download.saveMany(BatchDownloadType.SelectDirectory, {
        files: [{ url: 'blob:x', fileName: 'a.flac' }],
      }),
    ).rejects.toSatisfy((err: unknown) => expectNotSupported(err, 'download.saveMany'));
  });

  test('undeclared key / pickDirectory capabilities throw NotSupportedMethod', async () => {
    const provider = createTauriProvider({ capabilities: emptyCaps });

    await expect(provider.download.pickDirectory()).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'download.pickDirectory'),
    );
    await expect(provider.keys.importNative([NativeImportType.QQMusic])).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'keys.importNative'),
    );
    await expect(provider.keys.importAndroidAdb({})).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'keys.importAndroidAdb'),
    );
  });

  test('saveMany still NotImplemented when a download type is explicitly declared', async () => {
    const provider = createTauriProvider({
      capabilities: {
        ...DEFAULT_TAURI_CAPABILITIES,
        downloadTypes: [BatchDownloadType.SelectDirectory],
      },
    });

    await expect(
      provider.download.saveMany(BatchDownloadType.SelectDirectory, {
        files: [{ url: 'blob:x', fileName: 'a.flac' }],
      }),
    ).rejects.toSatisfy((err: unknown) => expectNotImplemented(err, 'download.saveMany.SelectDirectory'));
    await expect(
      provider.download.saveMany(BatchDownloadType.PackZip, {
        files: [{ url: 'blob:x', fileName: 'a.flac' }],
      }),
    ).rejects.toSatisfy((err: unknown) => expectNotSupported(err, 'download.saveMany'));
  });

  test('importNative rejects empty or unsupported targets with NotSupportedMethod', async () => {
    const provider = createTauriProvider({
      capabilities: {
        ...DEFAULT_TAURI_CAPABILITIES,
        nativeKeyAccess: [NativeImportType.QQMusic],
      },
    });

    await expect(provider.keys.importNative([])).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'keys.importNative'),
    );
    await expect(provider.keys.importNative([NativeImportType.Kuwo])).rejects.toSatisfy((err: unknown) =>
      expectNotSupported(err, 'keys.importNative'),
    );
  });
});

describe('detectPlatformRuntime / createPlatformProvider', () => {
  test('jsdom defaults to browser runtime', () => {
    expect(detectPlatformRuntime()).toBe('browser');
    expect(createPlatformProvider().id).toBe('browser');
  });

  test('createPlatformProvider switches to Tauri when runtime is forced', () => {
    const provider = createPlatformProvider({ runtime: 'tauri' });
    expect(provider.id).toBe('tauri');
    expect(provider.capabilities.directFsAccess).toBe(true);
    expect(provider.capabilities.nativeKeyAccess.length).toBeGreaterThan(0);
  });

  test('createPlatformProvider({ runtime: "browser" }) stays browser', () => {
    const provider = createPlatformProvider({ runtime: 'browser' });
    expect(provider.id).toBe('browser');
    expect(provider.capabilities.directFsAccess).toBe(false);
  });

  test('window.__TAURI_INTERNALS__ selects tauri runtime', () => {
    const w = window as Window & { __TAURI_INTERNALS__?: unknown };
    w.__TAURI_INTERNALS__ = {};
    try {
      expect(detectPlatformRuntime()).toBe('tauri');
    } finally {
      delete w.__TAURI_INTERNALS__;
    }
  });
});
