import { DatabaseKeyExtractor } from '~/util/DatabaseKeyExtractor';
import { parseAndroidKugouMMKV } from '~/util/mmkv/kugou';
import type { StagingKugouKey } from './types';

/** Parse a Kugou MMKV / encrypted DB dump into staging key rows (without `id`). */
export async function importKugouKeysFromFile(file: File): Promise<null | Omit<StagingKugouKey, 'id'>[]> {
  if (/mggkey_multi_process/i.test(file.name)) {
    return parseAndroidKugouMMKV(new DataView(await file.arrayBuffer()));
  }
  if (/^KGMusicV3\.db$/.test(file.name)) {
    const extractor = await DatabaseKeyExtractor.getInstance();
    return extractor.extractKugouKeyFromEncryptedDb(await file.arrayBuffer());
  }
  return null;
}
