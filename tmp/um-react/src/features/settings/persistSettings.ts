import { debounce } from 'radash';

import type { AppStore } from '~/store';
import {
  settingsSlice,
  setProductionChanges,
  ProductionSettings,
  DEFAULT_BATCH_DOWNLOAD_SETTINGS,
  DEFAULT_DIRECT_WRITE_SETTINGS,
  BatchDownloadSettings,
  DirectWriteSettings,
} from './settingsSlice';
import { enumObject } from '~/util/objects';
import { getLogger } from '~/util/logUtils';
import { parseKwm2ProductionKey } from '~/features/kwm/types';
import { sanitizeQtfmAndroidKey } from '~/features/qtfm/types';
import { deepClone } from '~/util/deepClone';
import type { PlatformProvider } from '~/platform/PlatformProvider';

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

function mergeDirectWrite(source: Partial<DirectWriteSettings> | undefined): DirectWriteSettings {
  const result = { ...DEFAULT_DIRECT_WRITE_SETTINGS };
  if (!source) {
    return result;
  }
  if (source.outputMode === 'besideSource' || source.outputMode === 'fixedDirectory') {
    result.outputMode = source.outputMode;
  }
  if (source.fixedDirectoryPath === null || typeof source.fixedDirectoryPath === 'string') {
    result.fixedDirectoryPath = source.fixedDirectoryPath;
  }
  if (typeof source.deleteSourceAfterDecrypt === 'boolean') {
    result.deleteSourceAfterDecrypt = source.deleteSourceAfterDecrypt;
  }
  return result;
}

/** Normalize / sanitize loaded production settings against defaults. Exported for tests. */
export function mergeSettings(settings: ProductionSettings): ProductionSettings {
  const draft = deepClone(settingsSlice.getInitialState().production);

  draft.general.batchDownload = mergeBatchDownload(settings?.general?.batchDownload);
  draft.general.directWrite = mergeDirectWrite(settings?.general?.directWrite);

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
    draft.qtfm.android = sanitizeQtfmAndroidKey(settings.qtfm.android);
  }

  return draft;
}

/**
 * Load production settings via `provider.settings`, merge into the store, and
 * debounce-save on production changes. Storage details stay inside the provider.
 */
export function persistSettings(store: AppStore, provider: PlatformProvider) {
  let lastSettings: unknown;
  let cancelled = false;

  const unsubscribe = store.subscribe(
    debounce({ delay: 150 }, () => {
      const currentSettings = store.getState().settings.production;
      if (lastSettings !== currentSettings) {
        lastSettings = currentSettings;
        void provider.settings.save(currentSettings).then(
          () => getLogger().debug('settings saved'),
          () => {
            // save failed; keep lastSettings so we do not spin-retry on every tick
          },
        );
      }
    }),
  );

  void provider.settings
    .load()
    .then((loadedSettings) => {
      if (cancelled || !loadedSettings) {
        return;
      }
      const mergedSettings = mergeSettings(loadedSettings);
      store.dispatch(setProductionChanges(mergedSettings));
      // Avoid an immediate rewrite of the same production snapshot after load.
      lastSettings = store.getState().settings.production;
      getLogger().debug('settings loaded');
    })
    .catch(() => {
      // load failed, ignore.
    });

  return () => {
    cancelled = true;
    unsubscribe();
  };
}
