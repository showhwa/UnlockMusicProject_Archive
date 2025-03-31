import {  ParseKuwoHeaderPayload, ParseKuwoHeaderResponse } from '~/decrypt-worker/types.ts';
import { KuwoHeader } from '@unlock-music/crypto';

export const workerParseKuwoHeader = async ({ blobURI }: ParseKuwoHeaderPayload): Promise<ParseKuwoHeaderResponse> => {
  const blob = await fetch(blobURI, { headers: { Range: 'bytes=0-1023' } }).then((r) => r.blob());
  const arrayBuffer = await blob.arrayBuffer();

  try {
    const buffer = new Uint8Array(arrayBuffer.slice(0, 1024));
    const kwm = KuwoHeader.parse(buffer);
    const { qualityId, resourceId } = kwm;
    kwm.free();
    return { qualityId, resourceId };
  } catch {
    return null;
  }
};
