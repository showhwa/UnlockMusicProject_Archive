import { DatabaseKeyExtractor } from '~/util/DatabaseKeyExtractor';
import { parseAndroidQmEKey } from '~/util/mmkv/qm';
import { getFileName } from '~/util/pathHelper';
import type { StagingQMCv2Key } from './types';

/** Parse a QMCv2 key database / MMKV dump into staging key rows (without `id`). */
export async function importQMCv2KeysFromFile(file: File): Promise<null | Omit<StagingQMCv2Key, 'id'>[]> {
  const fileBuffer = await file.arrayBuffer();

  if (/(player_process[_.]db|music_audio_play)(\.db)?$/i.test(file.name)) {
    const extractor = await DatabaseKeyExtractor.getInstance();
    return extractor.extractQmcV2KeysFromSqliteDb(fileBuffer);
  }

  if (/MMKVStreamEncryptId|filenameEkeyMap|qmpc-mmkv-v1|(\.mmkv$)/i.test(file.name)) {
    const map = parseAndroidQmEKey(new DataView(fileBuffer));
    return Array.from(map.entries(), ([name, ekey]) => ({ name: getFileName(name), ekey }));
  }

  return null;
}
