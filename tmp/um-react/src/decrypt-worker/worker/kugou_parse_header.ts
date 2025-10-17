import { ParseKugouHeaderPayload, ParseKugouHeaderResponse } from '~/decrypt-worker/types.ts';
import { KuGouHeader } from '@unlock-music/crypto';

export const workerParseKugouHeader = async ({
  blobURI,
}: ParseKugouHeaderPayload): Promise<ParseKugouHeaderResponse> => {
  const blob = await fetch(blobURI, { headers: { Range: 'bytes=0-1023' } }).then((r) => r.blob());
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer.slice(0, 0x400));

  let kwm: KuGouHeader | undefined;

  try {
    kwm = new KuGouHeader(buffer);
    const { version, audioHash } = kwm;
    return { version, audioHash };
  } catch {
    return null;
  } finally {
    kwm?.free();
  }
};
