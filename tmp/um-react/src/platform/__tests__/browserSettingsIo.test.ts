import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import {
  createBrowserSettingsIo,
  DEFAULT_SETTINGS_STORAGE_KEY,
  type SettingsStorage,
} from '~/platform/browser/browserSettingsIo';
import { settingsSlice, type ProductionSettings } from '~/features/settings/settingsSlice';

function createMemoryStorage(initial: Record<string, string> = {}): SettingsStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

function sampleProduction(): ProductionSettings {
  const production = structuredClone(settingsSlice.getInitialState().production);
  production.qmc2.keys['demo.mflac'] = 'ekey-demo';
  production.qmc2.allowFuzzyNameSearch = false;
  production.general.batchDownload.blobZip = false;
  return production;
}

describe('createBrowserSettingsIo', () => {
  test('load returns null when key is missing or empty', async () => {
    const storage = createMemoryStorage();
    const io = createBrowserSettingsIo(storage);

    await expect(io.load()).resolves.toBeNull();

    storage.setItem(DEFAULT_SETTINGS_STORAGE_KEY, '');
    await expect(io.load()).resolves.toBeNull();
  });

  test('save then load round-trips production settings', async () => {
    const storage = createMemoryStorage();
    const io = createBrowserSettingsIo(storage, 'test-settings');
    const settings = sampleProduction();

    await io.save(settings);

    expect(storage.data['test-settings']).toBe(JSON.stringify(settings));
    await expect(io.load()).resolves.toEqual(settings);
  });

  test('load rejects on invalid JSON', async () => {
    const storage = createMemoryStorage({ [DEFAULT_SETTINGS_STORAGE_KEY]: '{not-json' });
    const io = createBrowserSettingsIo(storage);

    await expect(io.load()).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('BrowserProvider.settings', () => {
  test('round-trips through injected storage', async () => {
    const storage = createMemoryStorage();
    const provider = createBrowserProvider({ settingsStorage: storage, settingsStorageKey: 'um-test' });
    const settings = sampleProduction();

    await provider.settings.save(settings);
    await expect(provider.settings.load()).resolves.toEqual(settings);
    expect(JSON.parse(storage.data['um-test'])).toEqual(settings);
  });
});
