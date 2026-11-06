import type { StagingKugouKey } from '~/features/kugou/types';
import type { StagingKWMv2Key } from '~/features/kwm/types';
import type { StagingQMCv2Key } from '~/features/qmc/types';
import type { StagingQtfmSettings } from '~/features/qtfm/types';
import type { AndroidImportType, BatchDownloadType, NativeImportType } from './capabilities';

export interface PlatformCapabilities {
  /** Supported batch/single download modes (array). */
  downloadTypes: readonly BatchDownloadType[];
  /**
   * Whether the platform can write decrypted files directly to the local filesystem
   * (e.g. beside source or a fixed output directory). Gates DirectWrite-related settings UI.
   */
  directFsAccess: boolean;
  /** Android key import path (single value). */
  androidKeyAccess: AndroidImportType;
  /** One-click native import targets (array; empty = unsupported). */
  nativeKeyAccess: readonly NativeImportType[];
}

export interface DownloadOneInput {
  /** Object URL of the decrypted content. */
  url: string;
  /** Suggested download file name (including extension). */
  fileName: string;
}

export interface DownloadManyFile {
  url: string;
  fileName: string;
}

export interface DownloadManyInput {
  files: readonly DownloadManyFile[];
  /** Remember FS Access directory handle when using SelectDirectory. */
  rememberDirectory?: boolean;
}

export type DownloadManyResult = 'ok' | 'cancelled';

/**
 * Native / ADB import payload shaped for existing Redux `*ImportKeys` / qtfm staging updates.
 * Rows omit `id` (reducers assign ids).
 */
export interface NativeImportResult {
  qmc2?: Omit<StagingQMCv2Key, 'id'>[];
  kwm2?: Omit<StagingKWMv2Key, 'id'>[];
  kugou?: Omit<StagingKugouKey, 'id'>[];
  qtfm?: Partial<StagingQtfmSettings>;
}

export interface AndroidAdbImportOptions {
  /** Optional subset of formats to pull; omit = all declared android targets. */
  targets?: readonly NativeImportType[];
}
