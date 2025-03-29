import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers';
import { KuGou, KuGouHeader } from '@unlock-music/crypto';
import type { DecryptCommandOptions } from '~/decrypt-worker/types.ts';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';

export class KugouMusicDecipher implements DecipherInstance {
  cipherName = 'Kugou';

  async decrypt(buffer: Uint8Array, options: DecryptCommandOptions): Promise<DecipherResult | DecipherOK> {
    let kgm: KuGou | undefined;
    let kgmHdr: KuGouHeader | undefined;

    try {
      kgmHdr = new KuGouHeader(buffer.subarray(0, 0x400));
      kgm = KuGou.fromHeaderV5(kgmHdr, options.kugouKey);

      const audioBuffer = new Uint8Array(buffer.subarray(0x400));
      for (const [block, offset] of chunkBuffer(audioBuffer)) {
        kgm.decrypt(block, offset);
      }

      return {
        status: Status.OK,
        cipherName: this.cipherName,
        data: audioBuffer,
      };
    } finally {
      kgmHdr?.free();
      kgm?.free();
    }
  }

  public static make() {
    return new KugouMusicDecipher();
  }
}
