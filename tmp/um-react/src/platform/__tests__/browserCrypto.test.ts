import { loadDecryptWorkerCrypto } from '~/platform/browser/browserCrypto';
import { DECRYPTION_WORKER_ACTION_NAME } from '~/decrypt-worker/constants';

const { mockRequest, mockAdd } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockAdd: vi.fn(),
}));

vi.mock('~/decrypt-worker/client', () => ({
  workerClientBus: {
    request: mockRequest,
  },
  decryptionQueue: {
    add: mockAdd,
  },
}));

describe('loadDecryptWorkerCrypto', () => {
  beforeEach(() => {
    mockRequest.mockResolvedValue('1.2.3');
    mockAdd.mockResolvedValue({ decrypted: 'blob://d', ext: 'mp3' });
  });

  test('request forwards to workerClientBus after dynamic import', async () => {
    const crypto = await loadDecryptWorkerCrypto();

    await expect(crypto.request(DECRYPTION_WORKER_ACTION_NAME.VERSION, null)).resolves.toBe('1.2.3');
    expect(mockRequest).toHaveBeenCalledWith(DECRYPTION_WORKER_ACTION_NAME.VERSION, null);
  });

  test('enqueueDecrypt forwards to decryptionQueue.add after dynamic import', async () => {
    const crypto = await loadDecryptWorkerCrypto();
    const onPreProcess = vi.fn();
    const payload = {
      fileId: 'file://1',
      blobURI: 'blob://in',
      options: { fileName: 'a.bin' },
    };

    await expect(crypto.enqueueDecrypt(payload, onPreProcess)).resolves.toEqual({
      decrypted: 'blob://d',
      ext: 'mp3',
    });
    expect(mockAdd).toHaveBeenCalledWith(payload, onPreProcess);
  });
});
