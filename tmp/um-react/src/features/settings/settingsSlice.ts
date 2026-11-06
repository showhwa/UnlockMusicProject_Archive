import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
  type ProductionQMCv2Keys,
  type StagingQMCv2Key,
  qmc2ProductionToStaging,
  qmc2StagingToProductionKey,
  qmc2StagingToProductionValue,
} from '~/features/qmc/types';
import {
  type ProductionKWMv2Keys,
  type StagingKWMv2Key,
  kwm2ProductionToStaging,
  kwm2StagingToProductionKey,
  kwm2StagingToProductionValue,
} from '~/features/kwm/types';
import {
  type ProductionKugouKey,
  type StagingKugouKey,
  kugouProductionToStaging,
  kugouStagingToProductionKey,
  kugouStagingToProductionValue,
} from '~/features/kugou/types';
import { EMPTY_QTFM_SETTINGS, type ProductionQtfmSettings, type StagingQtfmSettings } from '~/features/qtfm/types';
import { productionKeyToStaging, stagingKeyToProduction } from './keyFormats';
import { createKeyListReducers } from './createKeyListReducers';

export interface BatchDownloadSettings {
  directoryPicker: boolean;
  rememberDirectory: boolean;
  streamingZip: boolean;
  blobZip: boolean;
}

/** Where native clients write decrypted files (gated by `capabilities.directFsAccess`). */
export type DirectWriteOutputMode = 'besideSource' | 'fixedDirectory';

export interface DirectWriteSettings {
  outputMode: DirectWriteOutputMode;
  /** Absolute path when `outputMode` is `fixedDirectory`; unused in the browser UI. */
  fixedDirectoryPath: string | null;
  deleteSourceAfterDecrypt: boolean;
}

export interface StagingSettings {
  general: {
    batchDownload: BatchDownloadSettings;
    directWrite: DirectWriteSettings;
  };
  qmc2: {
    keys: StagingQMCv2Key[];
    allowFuzzyNameSearch: boolean;
  };
  kwm2: {
    keys: StagingKWMv2Key[];
  };
  /**
   * KuGou / KGG keys.
   * UI route tab id is `kgg`; Redux / production persist key remains `kugou`.
   */
  kugou: {
    keys: StagingKugouKey[];
  };
  qtfm: StagingQtfmSettings;
}

export interface ProductionSettings {
  general: {
    batchDownload: BatchDownloadSettings;
    directWrite: DirectWriteSettings;
  };
  qmc2: {
    keys: ProductionQMCv2Keys; // {  [fileName]: ekey  }
    allowFuzzyNameSearch: boolean;
  };
  kwm2: {
    keys: ProductionKWMv2Keys; // { [`${rid}-${quality}`]: ekey }
  };
  /**
   * KuGou / KGG keys.
   * UI route tab id is `kgg`; localStorage production shape key remains `kugou` (do not rename).
   */
  kugou: {
    keys: ProductionKugouKey; // {  [fileName]: ekey  }
  };
  qtfm: ProductionQtfmSettings;
}

export const DEFAULT_BATCH_DOWNLOAD_SETTINGS: BatchDownloadSettings = {
  directoryPicker: true,
  rememberDirectory: true,
  streamingZip: true,
  blobZip: true,
};

export const DEFAULT_DIRECT_WRITE_SETTINGS: DirectWriteSettings = {
  outputMode: 'besideSource',
  fixedDirectoryPath: null,
  deleteSourceAfterDecrypt: false,
};

export interface SettingsState {
  dirty: boolean;
  staging: StagingSettings;
  production: ProductionSettings;
}

const initialState: SettingsState = {
  dirty: false,
  staging: {
    general: {
      batchDownload: { ...DEFAULT_BATCH_DOWNLOAD_SETTINGS },
      directWrite: { ...DEFAULT_DIRECT_WRITE_SETTINGS },
    },
    qmc2: { allowFuzzyNameSearch: true, keys: [] },
    kwm2: { keys: [] },
    qtfm: { ...EMPTY_QTFM_SETTINGS },
    kugou: { keys: [] },
  },
  production: {
    general: {
      batchDownload: { ...DEFAULT_BATCH_DOWNLOAD_SETTINGS },
      directWrite: { ...DEFAULT_DIRECT_WRITE_SETTINGS },
    },
    qmc2: { allowFuzzyNameSearch: true, keys: {} },
    kwm2: { keys: {} },
    kugou: { keys: {} },
    qtfm: { ...EMPTY_QTFM_SETTINGS },
  },
};

export const stagingToProduction = (staging: StagingSettings): ProductionSettings => ({
  general: {
    batchDownload: { ...staging.general.batchDownload },
    directWrite: { ...staging.general.directWrite },
  },
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

export const productionToStaging = (production: ProductionSettings): StagingSettings => ({
  general: {
    batchDownload: { ...production.general.batchDownload },
    directWrite: { ...production.general.directWrite },
  },
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

const qmc2KeyList = createKeyListReducers('qmc2', () => ({ name: '', ekey: '' }));
const kwm2KeyList = createKeyListReducers('kwm2', () => ({ ekey: '', quality: '', rid: '' }));
const kugouKeyList = createKeyListReducers('kugou', () => ({ audioHash: '', ekey: '' }));

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
    qmc2AddKey: qmc2KeyList.addKey,
    qmc2ImportKeys: qmc2KeyList.importKeys,
    qmc2DeleteKey: qmc2KeyList.deleteKey,
    qmc2UpdateKey: qmc2KeyList.updateKey,
    qmc2ClearKeys: qmc2KeyList.clearKeys,
    qmc2AllowFuzzyNameSearch(state, { payload: { enable } }: PayloadAction<{ enable: boolean }>) {
      state.staging.qmc2.allowFuzzyNameSearch = enable;
      state.dirty = true;
    },
    kwm2AddKey: kwm2KeyList.addKey,
    kwm2ImportKeys: kwm2KeyList.importKeys,
    kwm2DeleteKey: kwm2KeyList.deleteKey,
    kwm2UpdateKey: kwm2KeyList.updateKey,
    kwm2ClearKeys: kwm2KeyList.clearKeys,
    kugouAddKey: kugouKeyList.addKey,
    kugouImportKeys: kugouKeyList.importKeys,
    kugouDeleteKey: kugouKeyList.deleteKey,
    kugouUpdateKey: kugouKeyList.updateKey,
    kugouClearKeys: kugouKeyList.clearKeys,
    qtfmAndroidUpdateKey(state, { payload: { deviceKey } }: PayloadAction<{ deviceKey: string }>) {
      state.staging.qtfm.android = deviceKey;
      state.dirty = true;
    },
    updateBatchDownloadSetting(
      state,
      { payload: { key, value } }: PayloadAction<{ key: keyof BatchDownloadSettings; value: boolean }>,
    ) {
      state.staging.general.batchDownload[key] = value;
      state.dirty = true;
    },
    updateDirectWriteSetting(state, { payload }: PayloadAction<Partial<DirectWriteSettings>>) {
      state.staging.general.directWrite = {
        ...state.staging.general.directWrite,
        ...payload,
      };
      state.dirty = true;
    },
    discardStagingChanges: (state) => {
      state.dirty = false;
      state.staging = productionToStaging(state.production);
    },
    /** Apply staging → production. Staging list row `id`s are kept (no productionToStaging round-trip). */
    commitStagingChange: (state) => {
      state.production = stagingToProduction(state.staging);
      state.dirty = false;
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
  updateBatchDownloadSetting,
  updateDirectWriteSetting,

  commitStagingChange,
  discardStagingChanges,
} = settingsSlice.actions;

export default settingsSlice.reducer;
