import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers.ts';
import { Xiami } from '@unlock-music/crypto';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';

export class XiamiDecipher implements DecipherInstance {
  cipherName = 'Xiami (XM)';

  async decrypt(buffer: Uint8Array): Promise<DecipherResult | DecipherOK> {
    const audioBuffer = buffer.slice(0x10);

    const xm = Xiami.from_header(buffer.subarray(0, 0x10));
    try {
      const { copyPlainLength } = xm;
      for (const [block] of chunkBuffer(audioBuffer.subarray(copyPlainLength))) {
        xm.decrypt(block);
      }
    } finally {
      xm.free();
    }

    return Promise.resolve({
      cipherName: this.cipherName,
      status: Status.OK,
      data: audioBuffer,
    });
  }

  public static make(this: void) {
    return new XiamiDecipher();
  }
}
