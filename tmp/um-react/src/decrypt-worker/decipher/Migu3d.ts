import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers.ts';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';
import { Migu3D } from '@unlock-music/crypto';

export class Migu3DKeylessDecipher implements DecipherInstance {
  cipherName = 'Migu3D (Keyless)';

  async decrypt(buffer: Uint8Array): Promise<DecipherResult | DecipherOK> {
    const audioBuffer = new Uint8Array(buffer);
    const mg3d = Migu3D.fromHeader(buffer.subarray(0, 0x100));

    try {
      for (const [block, i] of chunkBuffer(audioBuffer)) {
        mg3d.decrypt(block, i);
      }
    } finally {
      mg3d.free();
    }

    return Promise.resolve({
      cipherName: this.cipherName,
      status: Status.OK,
      data: audioBuffer,
    });
  }

  public static make(this: void) {
    return new Migu3DKeylessDecipher();
  }
}
