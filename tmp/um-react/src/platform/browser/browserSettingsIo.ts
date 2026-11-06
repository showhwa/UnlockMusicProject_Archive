import type { ProductionSettings } from '~/features/settings/settingsSlice';

export const DEFAULT_SETTINGS_STORAGE_KEY = 'um-react-settings';

/** Minimal storage surface used by browser settings persistence. */
export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

/**
 * localStorage-backed settings IO for the browser provider.
 * `load` returns `null` when the key is missing or empty; invalid JSON rejects.
 */
export function createBrowserSettingsIo(
  storage: SettingsStorage = localStorage,
  storageKey = DEFAULT_SETTINGS_STORAGE_KEY,
) {
  return {
    // async: matches PlatformProvider.settings.load(): Promise<...> (sync localStorage).
    // eslint-disable-next-line @typescript-eslint/require-await -- interface requires Promise
    async load(): Promise<ProductionSettings | null> {
      const raw = storage.getItem(storageKey);
      if (raw == null || raw === '') {
        return null;
      }
      return JSON.parse(raw) as ProductionSettings;
    },

    // async: matches PlatformProvider.settings.save(): Promise<void> (sync localStorage).
    // eslint-disable-next-line @typescript-eslint/require-await -- interface requires Promise
    async save(settings: ProductionSettings): Promise<void> {
      storage.setItem(storageKey, JSON.stringify(settings));
    },
  };
}
