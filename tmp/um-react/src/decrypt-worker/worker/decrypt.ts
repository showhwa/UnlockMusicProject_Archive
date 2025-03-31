import { timedLogger, withGroupedLogs as withTimeGroupedLogs } from '~/util/logUtils.ts';
import type { DecryptCommandOptions, DecryptCommandPayload } from '~/decrypt-worker/types.ts';
import { allCryptoFactories } from '../Deciphers.ts';
import { toBlob } from '~/decrypt-worker/util/buffer.ts';
import { DecipherFactory, DecipherInstance, Status } from '~/decrypt-worker/Deciphers.ts';
import { UnsupportedSourceFile } from '~/decrypt-worker/util/DecryptError.ts';
import { ready as umCryptoReady } from '@unlock-music/crypto';
import { go } from '~/util/go.ts';
import { detectAudioExtension } from '~/decrypt-worker/util/audioType.ts';

class DecryptCommandHandler {
  private readonly label: string;

  constructor(
    label: string,
    private buffer: Uint8Array,
    private options: DecryptCommandOptions,
  ) {
    this.label = `DecryptCommandHandler(${label})`;
  }

  log<R>(label: string, fn: () => Promise<R>): Promise<R> {
    return timedLogger(`${this.label}: ${label}`, fn);
  }

  async decrypt(decipherFactories: DecipherFactory[]) {
    const errors: string[] = [];
    for (const factory of decipherFactories) {
      const decipher = factory();

      const [result, error] = await go(this.tryDecryptWith(decipher));
      if (!error) {
        if (result) {
          return result;
        }
        errors.push(`${decipher.cipherName}: no response`);
        continue; // not supported
      }

      const errMsg = error.message;
      if (errMsg) {
        errors.push(`${decipher.cipherName}: ${errMsg}`);
      }
      if (error instanceof UnsupportedSourceFile) {
        console.debug('[%s] Not this decipher:', decipher.cipherName, error);
      } else {
        console.error('decrypt failed with unknown error: ', error);
      }
    }

    throw new UnsupportedSourceFile(errors.join('\n'));
  }

  async tryDecryptWith(decipher: DecipherInstance) {
    const result = await this.log(`try decrypt with ${decipher.cipherName}`, async () =>
      decipher.decrypt(this.buffer, this.options),
    );
    switch (result.status) {
      case Status.NOT_THIS_CIPHER:
        return null;
      case Status.FAILED:
        throw new Error(`failed: ${result.message}`);
      default:
        break;
    }

    // Check if we had a successful decryption
    let audioExt = result.overrideExtension || detectAudioExtension(result.data);
    if (!result.overrideExtension && audioExt === 'bin') {
      throw new UnsupportedSourceFile('unable to produce valid audio file');
    }

    // Convert mp4 to m4a
    if (audioExt.toLowerCase() === 'mp4') {
      audioExt = 'm4a';
    }

    return { decrypted: URL.createObjectURL(toBlob(result.data)), ext: audioExt };
  }
}

export const workerDecryptHandler = async ({ id: payloadId, blobURI, options }: DecryptCommandPayload) => {
  await umCryptoReady;
  const id = payloadId.replace('://', ':');
  const label = `decrypt(${id})`;
  return withTimeGroupedLogs(label, async () => {
    const buffer = await fetch(blobURI).then((r) => r.arrayBuffer());
    const handler = new DecryptCommandHandler(id, new Uint8Array(buffer), options);
    return handler.decrypt(allCryptoFactories);
  });
};
