import { BatchDownloadType } from '~/platform/capabilities';
import type { BatchDownloadSettings } from '~/features/settings/settingsSlice';

/**
 * Intersect user batch-download settings with platform `downloadTypes`.
 * Order matches browser fallback: SelectDirectory → StreamZip → PackZip.
 * Native direct-disk write is gated by `capabilities.directFsAccess`, not these modes.
 */
export function buildEnabledDownloadModes(
  settings: Pick<BatchDownloadSettings, 'directoryPicker' | 'streamingZip' | 'blobZip'>,
  downloadTypes: readonly BatchDownloadType[],
): BatchDownloadType[] {
  const available = new Set(downloadTypes);
  const modes: BatchDownloadType[] = [];

  if (settings.directoryPicker && available.has(BatchDownloadType.SelectDirectory)) {
    modes.push(BatchDownloadType.SelectDirectory);
  }
  if (settings.streamingZip && available.has(BatchDownloadType.StreamZip)) {
    modes.push(BatchDownloadType.StreamZip);
  }
  if (settings.blobZip && available.has(BatchDownloadType.PackZip)) {
    modes.push(BatchDownloadType.PackZip);
  }

  return modes;
}
