import { configureStore } from '@reduxjs/toolkit';
import { afterEach, vi } from 'vitest';

import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import type { SettingsStorage } from '~/platform/browser/browserSettingsIo';
import { persistSettings, mergeSettings } from '../persistSettings';
import { settingsSlice, setProductionChanges, type ProductionSettings } from '../settingsSlice';

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

function createStore() {
  return configureStore({
    reducer: { settings: settingsSlice.reducer },
  });
}

describe('persistSettings', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('loads via provider, merges, and dispatches production', async () => {
    const stored: ProductionSettings = {
      ...settingsSlice.getInitialState().production,
      qmc2: {
        allowFuzzyNameSearch: false,
        keys: { 'a.mflac': 'ek' },
      },
    };
    const storage = createMemoryStorage({ 'um-react-settings': JSON.stringify(stored) });
    const provider = createBrowserProvider({ settingsStorage: storage });
    const store = createStore();

    const unsubscribe = persistSettings(store, provider);
    await vi.waitFor(() => {
      expect(store.getState().settings.production.qmc2.keys).toEqual({ 'a.mflac': 'ek' });
      expect(store.getState().settings.production.qmc2.allowFuzzyNameSearch).toBe(false);
    });

    unsubscribe();
  });

  test('ignores failed loads and keeps defaults', async () => {
    const storage = createMemoryStorage({ 'um-react-settings': '{bad' });
    const provider = createBrowserProvider({ settingsStorage: storage });
    const store = createStore();
    const defaults = settingsSlice.getInitialState().production;

    const unsubscribe = persistSettings(store, provider);
    // Give the rejected load a turn to settle.
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().settings.production).toEqual(defaults);
    unsubscribe();
  });

  test('debounced save writes production through provider', async () => {
    vi.useFakeTimers();
    const storage = createMemoryStorage();
    const provider = createBrowserProvider({ settingsStorage: storage });
    const store = createStore();

    const unsubscribe = persistSettings(store, provider);
    await Promise.resolve();

    const next = mergeSettings({
      ...settingsSlice.getInitialState().production,
      qmc2: { allowFuzzyNameSearch: true, keys: { 'b.mflac': 'x' } },
    });
    store.dispatch(setProductionChanges(next));

    await vi.advanceTimersByTimeAsync(150);
    await Promise.resolve();

    expect(JSON.parse(storage.data['um-react-settings'])).toEqual(next);
    unsubscribe();
  });
});
