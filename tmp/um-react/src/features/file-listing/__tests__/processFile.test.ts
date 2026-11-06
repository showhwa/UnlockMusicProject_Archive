import type { WorkerActionName } from '~/decrypt-worker/actions';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants';
import type { BrowserCrypto } from '~/platform/browser/browserCrypto';
import { createBrowserProvider } from '~/platform/browser/BrowserProvider';
import { setPlatform } from '~/platform/platformSingleton';
import { setupStore } from '~/store';
import { ListingMode, ProcessState, processFile, selectFiles } from '../fileListingSlice';
import { untouchedFile } from './__fixture__/file-list';

describe('processFile', () => {
  test('parses headers via platform.crypto then enqueueDecrypts', async () => {
    const request = vi.fn((action: WorkerActionName) => {
      if (action === 'FIND_QMC_MUSICEX_NAME') {
        return Promise.resolve('track.mflac');
      }
      return Promise.resolve(null);
    });
    const enqueueDecrypt = vi.fn().mockResolvedValue({ decrypted: 'blob://out', ext: 'flac' });
    const crypto: BrowserCrypto = { request, enqueueDecrypt };
    setPlatform(createBrowserProvider({ crypto }));

    const fileId = 'file://untouched';
    const store = setupStore({
      fileListing: {
        files: { [fileId]: { ...untouchedFile } },
        displayMode: ListingMode.LIST,
      },
    });

    const result = await store.dispatch(processFile({ fileId }));

    expect(result.type).toBe(processFile.fulfilled.type);
    expect(request).toHaveBeenCalledWith(DECRYPTION_WORKER_ACTION_NAME.FIND_QMC_MUSICEX_NAME, {
      blobURI: untouchedFile.raw,
    });
    expect(request).toHaveBeenCalledWith(DECRYPTION_WORKER_ACTION_NAME.KUWO_PARSE_HEADER, {
      blobURI: untouchedFile.raw,
    });
    expect(request).toHaveBeenCalledWith(DECRYPTION_WORKER_ACTION_NAME.KUGOU_PARSE_HEADER, {
      blobURI: untouchedFile.raw,
    });
    expect(enqueueDecrypt).toHaveBeenCalledTimes(1);
    const [decryptPayload, onPreProcess] = enqueueDecrypt.mock.calls[0] as [
      { fileId: string; blobURI: string; options: { fileName: string } },
      () => void,
    ];
    expect(decryptPayload).toMatchObject({
      fileId,
      blobURI: untouchedFile.raw,
      options: { fileName: untouchedFile.fileName },
    });
    expect(typeof onPreProcess).toBe('function');

    const file = selectFiles(store.getState())[fileId];
    expect(file.state).toBe(ProcessState.COMPLETE);
    expect(file.decrypted).toBe('blob://out');
    expect(file.ext).toBe('flac');
  });

  test('rejects when file id is missing', async () => {
    const crypto: BrowserCrypto = {
      request: vi.fn(),
      enqueueDecrypt: vi.fn(),
    };
    setPlatform(createBrowserProvider({ crypto }));
    const store = setupStore({
      fileListing: {
        files: {},
        displayMode: ListingMode.LIST,
      },
    });

    const result = await store.dispatch(processFile({ fileId: 'missing' }));
    expect(result.type).toBe(processFile.rejected.type);
  });
});
