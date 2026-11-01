import { parseAndroidKuwoEKey, parseIosKuwoEKey } from '~/util/mmkv/kuwo';
import type { StagingKWMv2Key } from './types';

/** Parse a Kuwo MMKV / iOS ekey dump into staging key rows (without `id`). */
export async function importKWMv2KeysFromFile(file: File): Promise<null | Omit<StagingKWMv2Key, 'id'>[]> {
  if (/cn\.kuwo\.player\.mmkv/i.test(file.name)) {
    return parseAndroidKuwoEKey(new DataView(await file.arrayBuffer()));
  }
  if (/kw_ekey/.test(file.name)) {
    return parseIosKuwoEKey(new DataView(await file.arrayBuffer()));
  }
  return null;
}
