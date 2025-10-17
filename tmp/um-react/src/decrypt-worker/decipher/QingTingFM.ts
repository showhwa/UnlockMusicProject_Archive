import type { DecryptCommandOptions } from '~/decrypt-worker/types.ts';
import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers.ts';
import { QingTingFM } from '@unlock-music/crypto';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';
import { unhex } from '~/util/hex.ts';

export class QignTingFMDecipher implements DecipherInstance {
  cipherName = 'QingTingFM (Android, qta)';

  async decrypt(buffer: Uint8Array, opts: DecryptCommandOptions): Promise<DecipherResult | DecipherOK> {
    const key = unhex(opts.qingTingAndroidKey || '');
    const iv = QingTingFM.getFileIV(opts.fileName);

    if (key.byteLength !== 16 || iv.byteLength !== 16) {
      return {
        status: Status.FAILED,
        message: 'device key or iv invalid',
      };
    }

    const audioBuffer = new Uint8Array(buffer);
    const qtfm = new QingTingFM(key, iv);
    try {
      for (const [block, i] of chunkBuffer(audioBuffer)) {
        qtfm.decrypt(block, i);
      }
    } finally {
      qtfm.free();
    }
    return Promise.resolve({
      cipherName: this.cipherName,
      status: Status.OK,
      data: audioBuffer,
    });
  }

  public static make(this: void) {
    return new QignTingFMDecipher();
  }
}
