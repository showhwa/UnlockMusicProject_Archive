import type { RootState } from '~/store';

export const selectStagingQtfmAndroidKey = (state: RootState) => state.settings.staging.qtfm.android;
export const selectQtfmAndroidKey = (state: RootState) => state.settings.production.qtfm.android;
