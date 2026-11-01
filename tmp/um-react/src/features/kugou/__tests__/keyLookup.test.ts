import { configureStore } from '@reduxjs/toolkit';

import settingsReducer, { settingsSlice } from '~/features/settings/settingsSlice';
import type { RootState } from '~/store';
import { selectKugouKey } from '../keyLookup';

function storeWithKugouKeys(keys: Record<string, string>) {
  const base = settingsSlice.getInitialState();
  return configureStore({
    reducer: { settings: settingsReducer },
    preloadedState: {
      settings: {
        ...base,
        production: {
          ...base.production,
          kugou: { keys },
        },
      },
    },
  });
}

describe('selectKugouKey', () => {
  test('returns key for matching audioHash', () => {
    const hash = 'a'.repeat(32);
    const store = storeWithKugouKeys({ [hash]: 'ek' });
    expect(selectKugouKey(store.getState() as RootState, { audioHash: hash } as never)).toBe('ek');
  });

  test('returns undefined for unknown hash or null header', () => {
    const store = storeWithKugouKeys({ ['b'.repeat(32)]: 'ek' });
    expect(selectKugouKey(store.getState() as RootState, { audioHash: 'c'.repeat(32) } as never)).toBeUndefined();
    expect(selectKugouKey(store.getState() as RootState, null)).toBeUndefined();
  });
});
