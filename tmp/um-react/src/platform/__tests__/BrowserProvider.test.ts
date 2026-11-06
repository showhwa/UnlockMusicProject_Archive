import { AndroidImportType, BatchDownloadType } from '~/platform/capabilities';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import type { BrowserCrypto } from '~/platform/browser/browserCrypto';
import { createPlatformProvider } from '~/platform/createPlatformProvider';
import { NotSupportedMethod, PlatformNotInitializedError } from '~/platform/errors';

function createMockCrypto(overrides: Partial<BrowserCrypto> = {}): BrowserCrypto {
  return {
    request: vi.fn().mockResolvedValue('9.9.9'),
    enqueueDecrypt: vi.fn().mockResolvedValue({ decrypted: 'blob://out', ext: 'flac' }),
    ...overrides,
  };
}

describe('BrowserProvider', () => {
  test('jsdom without directory/save pickers exposes only PackZip', () => {
    expect(typeof window.showDirectoryPicker).toBe('undefined');
    expect(typeof window.showSaveFilePicker).toBe('undefined');

    const provider = createBrowserProvider();

    expect(provider.id).toBe('browser');
    expect(provider.capabilities).toEqual({
      downloadTypes: [BatchDownloadType.PackZip],
      directFsAccess: false,
      androidKeyAccess: AndroidImportType.None,
      nativeKeyAccess: [],
    });
  });

  test('keys.importNative throws NotSupportedMethod', async () => {
    const provider = createBrowserProvider();

    await expect(provider.keys.importNative([])).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof NotSupportedMethod && err.code === 'NOT_SUPPORTED' && err.capability === 'keys.importNative'
      );
    });
  });

  test('keys.importAndroidAdb throws NotSupportedMethod', async () => {
    const provider = createBrowserProvider();

    await expect(provider.keys.importAndroidAdb({})).rejects.toBeInstanceOf(NotSupportedMethod);
  });

  test('crypto before init rejects with PlatformNotInitializedError', async () => {
    const loadCrypto = vi.fn();
    const provider = createBrowserProvider({ loadCrypto });

    await expect(provider.crypto.request('VERSION', null)).rejects.toSatisfy((err: unknown) => {
      return (
        err instanceof PlatformNotInitializedError &&
        err.code === 'NOT_INITIALIZED' &&
        err.capability === 'crypto.request'
      );
    });
    expect(loadCrypto).not.toHaveBeenCalled();
  });

  test('constructing provider does not call loadCrypto', () => {
    const loadCrypto = vi.fn();
    createBrowserProvider({ loadCrypto });
    expect(loadCrypto).not.toHaveBeenCalled();
  });

  test('init loads crypto once and is idempotent under concurrency', async () => {
    const request = vi.fn().mockResolvedValue('9.9.9');
    const loadCrypto = vi.fn().mockResolvedValue(createMockCrypto({ request }));
    const provider = createBrowserProvider({ loadCrypto });

    await Promise.all([provider.init(), provider.init()]);
    await provider.init();

    expect(loadCrypto).toHaveBeenCalledTimes(1);
    await expect(provider.crypto.request('VERSION', null)).resolves.toBe('9.9.9');
    expect(request).toHaveBeenCalledWith('VERSION', null);
  });

  test('crypto.* waits for in-flight init', async () => {
    let resolveLoad!: (value: BrowserCrypto) => void;
    const loadCrypto = vi.fn(
      () =>
        new Promise<BrowserCrypto>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const provider = createBrowserProvider({ loadCrypto });

    const initPromise = provider.init();
    const requestPromise = provider.crypto.request('VERSION', null);

    resolveLoad(createMockCrypto());
    await initPromise;
    await expect(requestPromise).resolves.toBe('9.9.9');
  });

  test('crypto uses injected backend without init', async () => {
    const request = vi.fn().mockResolvedValue('injected');
    const enqueueDecrypt = vi.fn().mockResolvedValue({ decrypted: 'blob://out', ext: 'flac' });
    const loadCrypto = vi.fn();
    const provider = createBrowserProvider({ crypto: { request, enqueueDecrypt }, loadCrypto });

    await expect(provider.crypto.request('VERSION', null)).resolves.toBe('injected');
    await expect(
      provider.crypto.enqueueDecrypt({
        fileId: 'file://1',
        blobURI: 'blob://in',
        options: { fileName: 'a.bin' },
      }),
    ).resolves.toEqual({ decrypted: 'blob://out', ext: 'flac' });
    await expect(provider.init()).resolves.toBeUndefined();
    expect(loadCrypto).not.toHaveBeenCalled();
  });

  test('download.saveMany rejects types outside downloadTypes', async () => {
    const provider = createBrowserProvider({
      crypto: createMockCrypto(),
      downloadTypes: [BatchDownloadType.PackZip],
    });

    await expect(
      provider.download.saveMany(BatchDownloadType.SelectDirectory, {
        files: [{ url: 'blob:x', fileName: 'a.flac' }],
      }),
    ).rejects.toBeInstanceOf(NotSupportedMethod);
  });

  test('download.saveOne works when PackZip is available', async () => {
    const saveOne = vi.fn().mockResolvedValue(undefined);
    const provider = createBrowserProvider({
      crypto: createMockCrypto(),
      download: {
        saveOne,
        saveMany: vi.fn(),
        pickDirectory: vi.fn(),
      },
    });

    await provider.download.saveOne({ url: 'blob:x', fileName: 'a.flac' });
    expect(saveOne).toHaveBeenCalledWith({ url: 'blob:x', fileName: 'a.flac' });
  });

  test('settings.load returns null when storage is empty', async () => {
    const provider = createBrowserProvider({
      settingsStorage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    });

    await expect(provider.settings.load()).resolves.toBeNull();
  });

  test('createPlatformProvider defaults to browser outside Tauri', () => {
    const provider = createPlatformProvider({ runtime: 'browser' });
    expect(provider.id).toBe('browser');
    expect(provider.capabilities.nativeKeyAccess).toEqual([]);
    expect(provider.capabilities.androidKeyAccess).toBe(AndroidImportType.None);
    expect(provider.capabilities.directFsAccess).toBe(false);
  });
});
