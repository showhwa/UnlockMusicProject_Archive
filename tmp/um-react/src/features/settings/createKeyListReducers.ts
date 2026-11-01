import type { PayloadAction, WritableDraft } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';

import type { StagingQMCv2Key } from '~/features/qmc/types';
import type { StagingKWMv2Key } from '~/features/kwm/types';
import type { StagingKugouKey } from '~/features/kugou/types';

/** Formats that store keys as a staging list (array with stable `id`). */
export type KeyListFormat = 'qmc2' | 'kwm2' | 'kugou';

type StagingKeyByFormat = {
  qmc2: StagingQMCv2Key;
  kwm2: StagingKWMv2Key;
  kugou: StagingKugouKey;
};

/** Minimal state shape so this module does not import settingsSlice (avoids cycles). */
type KeyListSettingsState = {
  dirty: boolean;
  staging: {
    qmc2: { keys: StagingQMCv2Key[] };
    kwm2: { keys: StagingKWMv2Key[] };
    kugou: { keys: StagingKugouKey[] };
  };
};

/**
 * Shared Add / Import / Delete / Update / Clear reducers for staging key lists.
 * Action names are wired by the caller (`qmc2AddKey`, `kwm2AddKey`, …).
 *
 * Returns arrow-function reducers so they can be assigned into `createSlice` without
 * unbound-method lint issues.
 */
export function createKeyListReducers<F extends KeyListFormat>(
  path: F,
  emptyItem: () => Omit<StagingKeyByFormat[F], 'id'>,
) {
  type T = StagingKeyByFormat[F];
  type Field = Exclude<keyof T, 'id'>;
  type DraftState = WritableDraft<KeyListSettingsState>;

  const getKeys = (state: DraftState): T[] => state.staging[path].keys as T[];

  const setKeys = (state: DraftState, keys: T[]) => {
    // Generic path makes TS widen the union; cast is safe for a fixed `path`.
    (state.staging[path] as { keys: T[] }).keys = keys;
  };

  return {
    addKey: (state: DraftState) => {
      getKeys(state).push({ id: nanoid(), ...emptyItem() } as T);
      state.dirty = true;
    },
    importKeys: (state: DraftState, { payload }: PayloadAction<Omit<T, 'id'>[]>) => {
      getKeys(state).push(...payload.map((item) => ({ id: nanoid(), ...item }) as T));
      state.dirty = true;
    },
    deleteKey: (state: DraftState, { payload: { id } }: PayloadAction<{ id: string }>) => {
      setKeys(
        state,
        getKeys(state).filter((item) => item.id !== id),
      );
      state.dirty = true;
    },
    updateKey: (
      state: DraftState,
      { payload: { id, field, value } }: PayloadAction<{ id: string; field: Field; value: string }>,
    ) => {
      const keyItem = getKeys(state).find((item) => item.id === id);
      if (keyItem) {
        (keyItem as Record<Field, string>)[field] = value;
        state.dirty = true;
      }
    },
    clearKeys: (state: DraftState) => {
      setKeys(state, []);
      state.dirty = true;
    },
  };
}
