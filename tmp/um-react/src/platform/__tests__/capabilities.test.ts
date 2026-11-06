import { AndroidImportType, BatchDownloadType, NativeImportType } from '~/platform/capabilities';
import { NotImplementedError, NotSupportedMethod, PlatformNotInitializedError } from '~/platform/errors';

describe('platform capabilities enums', () => {
  test('BatchDownloadType members stay stable', () => {
    expect(BatchDownloadType).toEqual({
      SelectDirectory: 'SelectDirectory',
      StreamZip: 'StreamZip',
      PackZip: 'PackZip',
    });
  });

  test('AndroidImportType members stay stable', () => {
    expect(AndroidImportType).toEqual({
      None: 'none',
      Adb: 'adb',
    });
  });

  test('NativeImportType members stay stable', () => {
    expect(NativeImportType).toEqual({
      QQMusic: 'qqmusic',
      Kuwo: 'kuwo',
      Kugou: 'kugou',
      QingTing: 'qtfm',
    });
  });
});

describe('NotImplementedError', () => {
  test('exposes code, capability, and default message', () => {
    const err = new NotImplementedError('crypto.request');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotImplementedError);
    expect(err.code).toBe('NOT_IMPLEMENTED');
    expect(err.capability).toBe('crypto.request');
    expect(err.name).toBe('NotImplementedError');
    expect(err.message).toBe('Capability not implemented: crypto.request');
  });

  test('accepts a custom message', () => {
    const err = new NotImplementedError('settings.save', 'storage backend pending');
    expect(err.message).toBe('storage backend pending');
    expect(err.capability).toBe('settings.save');
  });
});

describe('NotSupportedMethod', () => {
  test('exposes code, capability, and default message', () => {
    const err = new NotSupportedMethod('keys.importNative');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NotSupportedMethod);
    expect(err.code).toBe('NOT_SUPPORTED');
    expect(err.capability).toBe('keys.importNative');
    expect(err.name).toBe('NotSupportedMethod');
    expect(err.message).toBe('Capability not supported: keys.importNative');
  });

  test('accepts a custom message', () => {
    const err = new NotSupportedMethod('download.saveMany', 'SelectDirectory unavailable on this platform');
    expect(err.message).toBe('SelectDirectory unavailable on this platform');
    expect(err.capability).toBe('download.saveMany');
  });

  test('is distinct from NotImplementedError', () => {
    const unsupported = new NotSupportedMethod('keys.importNative');
    const unimplemented = new NotImplementedError('keys.importNative');

    expect(unsupported).not.toBeInstanceOf(NotImplementedError);
    expect(unimplemented).not.toBeInstanceOf(NotSupportedMethod);
    expect(unsupported.code).not.toBe(unimplemented.code);
  });
});

describe('PlatformNotInitializedError', () => {
  test('exposes code, capability, and default message', () => {
    const err = new PlatformNotInitializedError('crypto.request');

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PlatformNotInitializedError);
    expect(err.code).toBe('NOT_INITIALIZED');
    expect(err.capability).toBe('crypto.request');
    expect(err.name).toBe('PlatformNotInitializedError');
    expect(err.message).toBe('Platform not initialized; call init() before using crypto.request');
  });
});
