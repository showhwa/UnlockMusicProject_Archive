import type { FetchMusicExNamePayload } from '~/decrypt-worker/types.ts';
import { QMCFooter } from '@unlock-music/crypto';

export const workerParseMusicExMediaName = async ({ blobURI }: FetchMusicExNamePayload) => {
  const blob = await fetch(blobURI, { headers: { Range: 'bytes=-1024' } }).then((r) => r.blob());
  const arrayBuffer = await blob.arrayBuffer();

  try {
    const buffer = new Uint8Array(arrayBuffer.slice(-1024));
    const footer = QMCFooter.parse(buffer);
    return footer?.mediaName || null;
  } catch {
    return null;
  }
};
