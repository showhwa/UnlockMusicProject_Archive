import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers';
import { NCMFile } from '@unlock-music/crypto';
import { chunkBuffer } from '~/decrypt-worker/util/buffer.ts';
import { UnsupportedSourceFile } from '~/decrypt-worker/util/DecryptError.ts';

export class NetEaseCloudMusicDecipher implements DecipherInstance {
  cipherName = 'NCM/PC';

  tryInit(ncm: NCMFile, buffer: Uint8Array) {
    let neededLength = 1024;
    while (neededLength !== 0) {
      console.debug('NCM/open: read %d bytes', neededLength);
      neededLength = ncm.open(buffer.subarray(0, neededLength));
      if (neededLength === -1) {
        throw new UnsupportedSourceFile('file is not ncm');
      }
    }
  }

  async decrypt(buffer: Uint8Array): Promise<DecipherResult | DecipherOK> {
    const ncm = new NCMFile();
    try {
      this.tryInit(ncm, buffer);

      const audioBuffer = buffer.slice(ncm.audioOffset);
      for (const [block, offset] of chunkBuffer(audioBuffer)) {
        ncm.decrypt(block, offset);
      }
      return {
        status: Status.OK,
        cipherName: this.cipherName,
        data: audioBuffer,
      };
    } finally {
      ncm.free();
    }
  }

  public static make() {
    return new NetEaseCloudMusicDecipher();
  }
}
