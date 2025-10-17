import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers';
import { KuwoHeader, KWMDecipher } from '@unlock-music/crypto';
import type { DecryptCommandOptions } from '~/decrypt-worker/types.ts';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';

export class KuwoMusicDecipher implements DecipherInstance {
  cipherName = 'Kuwo';

  async decrypt(buffer: Uint8Array, options: DecryptCommandOptions): Promise<DecipherResult | DecipherOK> {
    let header: KuwoHeader | undefined;
    let kwm: KWMDecipher | undefined;

    try {
      header = KuwoHeader.parse(buffer.subarray(0, 0x400));
      kwm = new KWMDecipher(header, options.kwm2key);

      const audioBuffer = new Uint8Array(buffer.subarray(0x400));
      for (const [block, offset] of chunkBuffer(audioBuffer)) {
        kwm.decrypt(block, offset);
      }
      return Promise.resolve({
        status: Status.OK,
        cipherName: this.cipherName,
        data: audioBuffer,
      });
    } finally {
      kwm?.free();
      header?.free();
    }
  }

  public static make(this: void) {
    return new KuwoMusicDecipher();
  }
}
