import { BatchDownloadType } from '~/platform/capabilities';
import { createBrowserDownload } from '~/platform/browser/browserDownload';
import { NotSupportedMethod } from '~/platform/errors';
import * as triggerDownload from '~/util/triggerDownload';

describe('createBrowserDownload', () => {
  test('saveOne triggers anchor download when any type is available', async () => {
    const spy = vi.spyOn(triggerDownload, 'triggerAnchorDownload').mockImplementation(() => undefined);
    const download = createBrowserDownload([BatchDownloadType.PackZip]);

    await download.saveOne({ url: 'blob:x', fileName: 'a.flac' });

    expect(spy).toHaveBeenCalledWith('blob:x', 'a.flac');
    spy.mockRestore();
  });

  test('saveOne throws NotSupportedMethod when downloadTypes is empty', async () => {
    const download = createBrowserDownload([]);

    await expect(download.saveOne({ url: 'blob:x', fileName: 'a.flac' })).rejects.toSatisfy((err: unknown) => {
      return err instanceof NotSupportedMethod && err.capability === 'download.saveOne';
    });
  });

  test('saveMany rejects types outside downloadTypes', async () => {
    const download = createBrowserDownload([BatchDownloadType.PackZip]);

    await expect(
      download.saveMany(BatchDownloadType.SelectDirectory, { files: [{ url: 'blob:x', fileName: 'a.flac' }] }),
    ).rejects.toBeInstanceOf(NotSupportedMethod);

    await expect(
      download.saveMany(BatchDownloadType.StreamZip, { files: [{ url: 'blob:x', fileName: 'a.flac' }] }),
    ).rejects.toBeInstanceOf(NotSupportedMethod);
  });

  test('pickDirectory throws NotSupportedMethod (no OS path in browser)', async () => {
    const download = createBrowserDownload([BatchDownloadType.PackZip]);

    await expect(download.pickDirectory()).rejects.toSatisfy((err: unknown) => {
      return err instanceof NotSupportedMethod && err.capability === 'download.pickDirectory';
    });
  });
});
