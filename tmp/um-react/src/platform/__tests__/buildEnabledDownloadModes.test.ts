import { BatchDownloadType } from '~/platform/capabilities';
import { buildEnabledDownloadModes } from '~/platform/buildEnabledDownloadModes';
import type { BatchDownloadSettings } from '~/features/settings/settingsSlice';

const allOn: Pick<BatchDownloadSettings, 'directoryPicker' | 'streamingZip' | 'blobZip'> = {
  directoryPicker: true,
  streamingZip: true,
  blobZip: true,
};

const allOff: Pick<BatchDownloadSettings, 'directoryPicker' | 'streamingZip' | 'blobZip'> = {
  directoryPicker: false,
  streamingZip: false,
  blobZip: false,
};

describe('buildEnabledDownloadModes', () => {
  test('intersects settings with capabilities in fallback order', () => {
    expect(
      buildEnabledDownloadModes(allOn, [
        BatchDownloadType.SelectDirectory,
        BatchDownloadType.StreamZip,
        BatchDownloadType.PackZip,
      ]),
    ).toEqual([BatchDownloadType.SelectDirectory, BatchDownloadType.StreamZip, BatchDownloadType.PackZip]);
  });

  test('omits modes disabled in settings even when capable', () => {
    expect(
      buildEnabledDownloadModes({ directoryPicker: false, streamingZip: true, blobZip: true }, [
        BatchDownloadType.SelectDirectory,
        BatchDownloadType.StreamZip,
        BatchDownloadType.PackZip,
      ]),
    ).toEqual([BatchDownloadType.StreamZip, BatchDownloadType.PackZip]);
  });

  test('omits modes missing from capabilities even when enabled in settings', () => {
    expect(buildEnabledDownloadModes(allOn, [BatchDownloadType.PackZip])).toEqual([BatchDownloadType.PackZip]);
  });

  test('returns empty when no overlap', () => {
    expect(buildEnabledDownloadModes(allOff, [BatchDownloadType.PackZip])).toEqual([]);
    expect(buildEnabledDownloadModes(allOn, [])).toEqual([]);
  });
});
