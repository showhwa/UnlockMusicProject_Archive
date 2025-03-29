import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';
import {
  ProductionKWMv2Keys,
  ProductionQMCv2Keys,
  StagingKWMv2Key,
  StagingQMCv2Key,
  kwm2ProductionToStaging,
  kwm2StagingToProductionKey,
  kwm2StagingToProductionValue,
  productionKeyToStaging,
  qmc2ProductionToStaging,
  qmc2StagingToProductionKey,
  qmc2StagingToProductionValue,
  stagingKeyToProduction,
  ProductionKugouKey,
  kugouProductionToStaging,
  kugouStagingToProductionKey,
  kugouStagingToProductionValue,
  StagingKugouKey,
} from './keyFormats';

export interface StagingSettings {
  qmc2: {
    keys: StagingQMCv2Key[];
    allowFuzzyNameSearch: boolean;
  };
  kwm2: {
    keys: StagingKWMv2Key[];
  };
  kugou: {
    keys: StagingKugouKey[];
  };
  qtfm: {
    android: string;
  };
}

export interface ProductionSettings {
  qmc2: {
    keys: ProductionQMCv2Keys; // {  [fileName]: ekey  }
    allowFuzzyNameSearch: boolean;
  };
  kwm2: {
    keys: ProductionKWMv2Keys; // { [`${rid}-${quality}`]: ekey }
  };
  kugou: {
    keys: ProductionKugouKey; // {  [fileName]: ekey  }
  };
  qtfm: {
    android: string;
  };
}

export interface SettingsState {
  dirty: boolean;
  staging: StagingSettings;
  production: ProductionSettings;
}

const initialState: SettingsState = {
  dirty: false,
  staging: {
    qmc2: { allowFuzzyNameSearch: true, keys: [] },
    kwm2: { keys: [] },
    qtfm: { android: '' },
    kugou: { keys: [] },
  },
  production: {
    qmc2: { allowFuzzyNameSearch: true, keys: {} },
    kwm2: { keys: {} },
    kugou: { keys: {} },
    qtfm: { android: '' },
  },
};

const stagingToProduction = (staging: StagingSettings): ProductionSettings => ({
  qmc2: {
    keys: stagingKeyToProduction(staging.qmc2.keys, qmc2StagingToProductionKey, qmc2StagingToProductionValue),
    allowFuzzyNameSearch: staging.qmc2.allowFuzzyNameSearch,
  },
  kwm2: {
    keys: stagingKeyToProduction(staging.kwm2.keys, kwm2StagingToProductionKey, kwm2StagingToProductionValue),
  },
  kugou: {
    keys: stagingKeyToProduction(staging.kugou.keys, kugouStagingToProductionKey, kugouStagingToProductionValue),
  },
  qtfm: staging.qtfm,
});

const productionToStaging = (production: ProductionSettings): StagingSettings => ({
  qmc2: {
    keys: productionKeyToStaging(production.qmc2.keys, qmc2ProductionToStaging),
    allowFuzzyNameSearch: production.qmc2.allowFuzzyNameSearch,
  },
  kwm2: {
    keys: productionKeyToStaging(production.kwm2.keys, kwm2ProductionToStaging),
  },
  kugou: {
    keys: productionKeyToStaging(production.kugou.keys, kugouProductionToStaging),
  },
  qtfm: production.qtfm,
});

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setProductionChanges: (_state, { payload }: PayloadAction<ProductionSettings>) => {
      return {
        dirty: false,
        production: payload,
        staging: productionToStaging(payload),
      };
    },
    //
    qmc2AddKey(state) {
      state.staging.qmc2.keys.push({ id: nanoid(), name: '', ekey: '' });
      state.dirty = true;
    },
    qmc2ImportKeys(state, { payload }: PayloadAction<Omit<StagingQMCv2Key, 'id'>[]>) {
      const newItems = payload.map((item) => ({ id: nanoid(), ...item }));
      state.staging.qmc2.keys.push(...newItems);
      state.dirty = true;
    },
    qmc2DeleteKey(state, { payload: { id } }: PayloadAction<{ id: string }>) {
      const qmc2 = state.staging.qmc2;
      qmc2.keys = qmc2.keys.filter((item) => item.id !== id);
      state.dirty = true;
    },
    qmc2UpdateKey(
      state,
      { payload: { id, field, value } }: PayloadAction<{ id: string; field: keyof StagingQMCv2Key; value: string }>,
    ) {
      const keyItem = state.staging.qmc2.keys.find((item) => item.id === id);
      if (keyItem) {
        keyItem[field] = value;
        state.dirty = true;
      }
    },
    qmc2ClearKeys(state) {
      state.staging.qmc2.keys = [];
      state.dirty = true;
    },
    qmc2AllowFuzzyNameSearch(state, { payload: { enable } }: PayloadAction<{ enable: boolean }>) {
      state.staging.qmc2.allowFuzzyNameSearch = enable;
      state.dirty = true;
    },
    // TODO: reuse the logic somehow?
    kwm2AddKey(state) {
      state.staging.kwm2.keys.push({ id: nanoid(), ekey: '', quality: '', rid: '' });
      state.dirty = true;
    },
    kwm2ImportKeys(state, { payload }: PayloadAction<Omit<StagingKWMv2Key, 'id'>[]>) {
      const newItems = payload.map((item) => ({ id: nanoid(), ...item }));
      state.staging.kwm2.keys.push(...newItems);
      state.dirty = true;
    },
    kwm2DeleteKey(state, { payload: { id } }: PayloadAction<{ id: string }>) {
      const kwm2 = state.staging.kwm2;
      kwm2.keys = kwm2.keys.filter((item) => item.id !== id);
      state.dirty = true;
    },
    kwm2UpdateKey(
      state,
      { payload: { id, field, value } }: PayloadAction<{ id: string; field: keyof StagingKWMv2Key; value: string }>,
    ) {
      const keyItem = state.staging.kwm2.keys.find((item) => item.id === id);
      if (keyItem) {
        keyItem[field] = value;
        state.dirty = true;
      }
    },
    kwm2ClearKeys(state) {
      state.staging.kwm2.keys = [];
      state.dirty = true;
    },
    kugouAddKey(state) {
      state.staging.kugou.keys.push({ id: nanoid(), audioHash: '', ekey: '' });
      state.dirty = true;
    },
    kugouImportKeys(state, { payload }: PayloadAction<Omit<StagingKugouKey, 'id'>[]>) {
      const newItems = payload.map((item) => ({ id: nanoid(), ...item }));
      state.staging.kugou.keys.push(...newItems);
      state.dirty = true;
    },
    kugouDeleteKey(state, { payload: { id } }: PayloadAction<{ id: string }>) {
      const kugou = state.staging.kugou;
      kugou.keys = kugou.keys.filter((item) => item.id !== id);
      state.dirty = true;
    },
    kugouUpdateKey(
      state,
      { payload: { id, field, value } }: PayloadAction<{ id: string; field: keyof StagingKugouKey; value: string }>,
    ) {
      const keyItem = state.staging.kugou.keys.find((item) => item.id === id);
      if (keyItem) {
        keyItem[field] = value;
        state.dirty = true;
      }
    },
    kugouClearKeys(state) {
      state.staging.kugou.keys = [];
      state.dirty = true;
    },
    qtfmAndroidUpdateKey(state, { payload: { deviceKey } }: PayloadAction<{ deviceKey: string }>) {
      state.staging.qtfm.android = deviceKey;
      state.dirty = true;
    },
    //
    discardStagingChanges: (state) => {
      state.dirty = false;
      state.staging = productionToStaging(state.production);
    },
    commitStagingChange: (state) => {
      const production = stagingToProduction(state.staging);
      return {
        dirty: false,
        // Sync back to staging
        staging: productionToStaging(production),
        production,
      };
    },
    resetConfig: () => {
      return initialState;
    },
  },
});

export const {
  setProductionChanges,
  resetConfig,

  qmc2AddKey,
  qmc2UpdateKey,
  qmc2DeleteKey,
  qmc2ClearKeys,
  qmc2ImportKeys,
  qmc2AllowFuzzyNameSearch,

  kwm2AddKey,
  kwm2UpdateKey,
  kwm2DeleteKey,
  kwm2ClearKeys,
  kwm2ImportKeys,

  kugouAddKey,
  kugouUpdateKey,
  kugouDeleteKey,
  kugouClearKeys,
  kugouImportKeys,

  qtfmAndroidUpdateKey,

  commitStagingChange,
  discardStagingChanges,
} = settingsSlice.actions;

export default settingsSlice.reducer;
