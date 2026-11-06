import { BatchDownloadType } from '~/platform/capabilities';
import { supportsDirectoryPicker, supportsStreamingZipDownload } from '~/util/batchDownloadCapabilities';

/**
 * Runtime download modes for the browser provider.
 * Order: directory picker → streaming ZIP → pack ZIP.
 * UI must read `capabilities.downloadTypes` rather than calling these probes directly.
 */
export function detectBrowserDownloadTypes(): BatchDownloadType[] {
  const types: BatchDownloadType[] = [];
  if (supportsDirectoryPicker()) {
    types.push(BatchDownloadType.SelectDirectory);
  }
  if (supportsStreamingZipDownload()) {
    types.push(BatchDownloadType.StreamZip);
  }
  types.push(BatchDownloadType.PackZip);
  return types;
}
