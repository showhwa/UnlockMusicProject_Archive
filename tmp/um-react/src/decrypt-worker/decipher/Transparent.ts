import { DecipherInstance, DecipherOK, DecipherResult, Status } from '~/decrypt-worker/Deciphers.ts';

export class TransparentDecipher implements DecipherInstance {
  cipherName = 'none';

  async decrypt(buffer: Uint8Array<ArrayBuffer>): Promise<DecipherResult | DecipherOK> {
    return Promise.resolve({
      cipherName: 'None',
      status: Status.OK,
      data: buffer,
      message: 'No decipher applied',
    });
  }

  public static make(this: void) {
    return new TransparentDecipher();
  }
}
