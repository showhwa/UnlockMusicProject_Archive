import { debounce } from 'radash';

import type { AppStore } from '~/store';
import {
  settingsSlice,
  setProductionChanges,
  ProductionSettings,
  DEFAULT_BATCH_DOWNLOAD_SETTINGS,
  BatchDownloadSettings,
} from './settingsSlice';
import { enumObject } from '~/util/objects';
import { getLogger } from '~/util/logUtils';
import { parseKwm2ProductionKey } from './keyFormats';
import { deepClone } from '~/util/deepClone';

const DEFAULT_STORAGE_KEY = 'um-react-settings';

function mergeBatchDownload(source: Partial<BatchDownloadSettings> | undefined): BatchDownloadSettings {
  const result = { ...DEFAULT_BATCH_DOWNLOAD_SETTINGS };
  if (!source) {
    return result;
  }
  for (const key of Object.keys(DEFAULT_BATCH_DOWNLOAD_SETTINGS) as (keyof BatchDownloadSettings)[]) {
    if (typeof source[key] === 'boolean') {
      result[key] = source[key];
    }
  }
  return result;
}

function mergeSettings(settings: ProductionSettings): ProductionSettings {
  const draft = deepClone(settingsSlice.getInitialState().production);

  draft.general.batchDownload = mergeBatchDownload(settings?.general?.batchDownload);

  if (settings?.qmc2) {
    const { allowFuzzyNameSearch, keys } = settings.qmc2;
    for (const [k, v] of enumObject(keys)) {
      if (typeof v === 'string') {
        draft.qmc2.keys[k] = v;
      }
    }

    if (typeof allowFuzzyNameSearch === 'boolean') {
      draft.qmc2.allowFuzzyNameSearch = allowFuzzyNameSearch;
    }
  }

  if (settings?.kwm2) {
    const { keys } = settings.kwm2;

    for (const [k, v] of enumObject(keys)) {
      if (typeof v === 'string' && parseKwm2ProductionKey(k)) {
        draft.kwm2.keys[k] = v;
      }
    }
  }

  if (settings?.kugou) {
    const { keys } = settings.kugou;

    for (const [k, v] of enumObject(keys)) {
      if (typeof v === 'string') {
        draft.kugou.keys[k] = v;
      }
    }
  }

  if (typeof settings?.qtfm?.android === 'string') {
    draft.qtfm.android = settings.qtfm.android.replace(/[^0-9a-fA-F]/g, '');
  }

  return draft;
}

export function persistSettings(store: AppStore, storageKey = DEFAULT_STORAGE_KEY) {
  let lastSettings: unknown;

  try {
    const loadedSettings = JSON.parse(localStorage.getItem(storageKey) ?? '') as ProductionSettings;
    if (loadedSettings) {
      const mergedSettings = mergeSettings(loadedSettings);
      store.dispatch(setProductionChanges(mergedSettings));
      getLogger().debug('settings loaded');
    }
  } catch {
    // load failed, ignore.
  }

  return store.subscribe(
    debounce({ delay: 150 }, () => {
      const currentSettings = store.getState().settings.production;
      if (lastSettings !== currentSettings) {
        lastSettings = currentSettings;
        localStorage.setItem(storageKey, JSON.stringify(currentSettings));
        getLogger().debug('settings saved');
      }
    }),
  );
}
