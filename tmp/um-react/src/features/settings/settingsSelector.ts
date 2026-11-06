import type { RootState } from '~/store';

/** Re-exports format key lookups so callers can keep a single settings import if desired. */
export {
  selectFinalQMCv2Settings,
  selectQMCv2KeyByFileName,
  selectStagingQMCv2Settings,
} from '~/features/qmc/keyLookup';
export { selectFinalKWMv2Keys, selectKWMv2Key, selectStagingKWMv2Keys } from '~/features/kwm/keyLookup';
export { selectFinalKugouV5Keys, selectKugouKey, selectStagingKugouV5Keys } from '~/features/kugou/keyLookup';
export { selectQtfmAndroidKey, selectStagingQtfmAndroidKey } from '~/features/qtfm/keyLookup';

export const selectIsSettingsNotSaved = (state: RootState) => state.settings.dirty;

export const selectStagingBatchDownloadSettings = (state: RootState) => state.settings.staging.general.batchDownload;
export const selectFinalBatchDownloadSettings = (state: RootState) => state.settings.production.general.batchDownload;

export const selectStagingDirectWriteSettings = (state: RootState) => state.settings.staging.general.directWrite;
export const selectFinalDirectWriteSettings = (state: RootState) => state.settings.production.general.directWrite;
