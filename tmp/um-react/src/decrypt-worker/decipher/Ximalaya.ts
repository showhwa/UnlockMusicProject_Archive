import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers';
import type { DecryptCommandOptions } from '~/decrypt-worker/types.ts';
import { decryptX2MHeader, decryptX3MHeader, XmlyPC } from '@unlock-music/crypto';
import { isDataLooksLikeAudio } from '~/decrypt-worker/util/audioType.ts';
import { UnsupportedSourceFile } from '~/decrypt-worker/util/DecryptError.ts';

export class XimalayaAndroidDecipher implements DecipherInstance {
  cipherName: string;

  constructor(
    private decipher: (buffer: Uint8Array) => void,
    private cipherType: string,
  ) {
    this.cipherName = `Ximalaya (Android, ${cipherType})`;
  }

  async decrypt(buffer: Uint8Array, _options: DecryptCommandOptions): Promise<DecipherResult | DecipherOK> {
    // Detect with first 0x400 bytes
    const slice = buffer.slice(0, 0x400);
    this.decipher(slice);
    if (!isDataLooksLikeAudio(slice)) {
      throw new UnsupportedSourceFile(`Not a Xmly android file (${this.cipherType})`);
    }
    const result = new Uint8Array(buffer);
    result.set(slice, 0);
    return Promise.resolve({
      cipherName: this.cipherName,
      status: Status.OK,
      data: result,
    });
  }

  public static makeX2M(this: void) {
    return new XimalayaAndroidDecipher(decryptX2MHeader, 'X2M');
  }

  public static makeX3M(this: void) {
    return new XimalayaAndroidDecipher(decryptX3MHeader, 'X3M');
  }
}

export class XimalayaPCDecipher implements DecipherInstance {
  cipherName = 'Ximalaya (PC)';

  async decrypt(buffer: Uint8Array, _options: DecryptCommandOptions): Promise<DecipherResult | DecipherOK> {
    // Detect with first 0x400 bytes
    const headerSize = XmlyPC.getHeaderSize(buffer.subarray(0, 1024));
    const xmly = new XmlyPC(buffer.subarray(0, headerSize));

    try {
      const { audioHeader, encryptedHeaderOffset, encryptedHeaderSize } = xmly;
      const plainAudioDataOffset = encryptedHeaderOffset + encryptedHeaderSize;
      const plainAudioDataLength = buffer.byteLength - plainAudioDataOffset;
      const encryptedAudioPart = buffer.slice(encryptedHeaderOffset, plainAudioDataOffset);
      const encryptedAudioPartLen = xmly.decrypt(encryptedAudioPart);
      const audioSize = audioHeader.byteLength + encryptedAudioPartLen + plainAudioDataLength;

      const result = new Uint8Array(audioSize);
      result.set(audioHeader);
      result.set(encryptedAudioPart, audioHeader.byteLength);
      result.set(buffer.subarray(plainAudioDataOffset), audioHeader.byteLength + encryptedAudioPartLen);
      return Promise.resolve({
        status: Status.OK,
        data: result,
        cipherName: this.cipherName,
      });
    } finally {
      xmly.free();
    }
  }

  public static make(this: void) {
    return new XimalayaPCDecipher();
  }
}
