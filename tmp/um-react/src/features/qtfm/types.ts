/** QingTing FM staging settings (`state.settings.staging.qtfm`). */
export interface StagingQtfmSettings {
  /** Android device key (hex). */
  android: string;
}

/** QingTing FM production settings (`state.settings.production.qtfm`; persist key `qtfm`). */
export type ProductionQtfmSettings = StagingQtfmSettings;

export const EMPTY_QTFM_SETTINGS: StagingQtfmSettings = { android: '' };

/** Strip non-hex characters from a pasted / typed device key. */
export function sanitizeQtfmAndroidKey(key: string): string {
  return key.replace(/[^0-9a-fA-F]/g, '');
}
