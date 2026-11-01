import { configureStore } from '@reduxjs/toolkit';

import settingsReducer, { settingsSlice } from '~/features/settings/settingsSlice';
import type { RootState } from '~/store';
import { selectQMCv2KeyByFileName } from '../keyLookup';

function storeWithQmcKeys(keys: Record<string, string>, allowFuzzyNameSearch = true) {
  const base = settingsSlice.getInitialState();
  return configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: {
      settings: {
        ...base,
        production: {
          ...base.production,
          qmc2: { allowFuzzyNameSearch, keys },
        },
      },
    },
  });
}

describe('selectQMCv2KeyByFileName', () => {
  test('returns exact match', () => {
    const store = storeWithQmcKeys({ 'song.mflac': 'ek-exact' });
    expect(selectQMCv2KeyByFileName(store.getState() as RootState, 'song.mflac')).toBe('ek-exact');
  });

  test('falls back to closest name when fuzzy search is enabled', () => {
    const store = storeWithQmcKeys({ 'song.mflac': 'ek-fuzzy' });
    expect(selectQMCv2KeyByFileName(store.getState() as RootState, 'songg.mflac')).toBe('ek-fuzzy');
  });

  test('returns undefined when fuzzy search is disabled and name misses', () => {
    const store = storeWithQmcKeys({ 'song.mflac': 'ek' }, false);
    expect(selectQMCv2KeyByFileName(store.getState() as RootState, 'other.mflac')).toBeUndefined();
  });
});
