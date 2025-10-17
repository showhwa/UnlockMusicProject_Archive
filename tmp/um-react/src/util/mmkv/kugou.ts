import type { StagingKugouKey } from '~/features/settings/keyFormats';
import { MMKVParser } from '../MMKVParser';

export function parseAndroidKugouMMKV(view: DataView<ArrayBuffer>): Omit<StagingKugouKey, 'id'>[] {
  const mmkv = new MMKVParser(view);
  const result: Omit<StagingKugouKey, 'id'>[] = [];
  while (!mmkv.eof) {
    const audioHash = mmkv.readString();
    const ekey = mmkv.readStringValue();

    if (audioHash.length === 0x20 && ekey) {
      result.push({ audioHash, ekey });
    }
  }
  return result;
}
