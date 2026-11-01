import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { importKWMv2KeysFromFile } from '../importKeys';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), '../../../util/mmkv/__tests__/__fixture__');

function fileFromFixture(name: string, path: string): File {
  const buff = readFileSync(path);
  return new File([buff], name);
}

describe('importKWMv2KeysFromFile', () => {
  test('parses Android Kuwo MMKV by filename', async () => {
    const file = fileFromFixture('cn.kuwo.player.mmkv.defaultconfig', join(fixtureDir, 'kuwo_android.mmkv'));
    await expect(importKWMv2KeysFromFile(file)).resolves.toEqual([
      { rid: '1234567', quality: '20201kmflac', ekey: 'xyz123' },
    ]);
  });

  test('parses iOS Kuwo ekey dump by filename', async () => {
    const file = fileFromFixture('kw_ekey', join(fixtureDir, 'kuwo_ios.mmkv'));
    await expect(importKWMv2KeysFromFile(file)).resolves.toEqual([
      { rid: '1234567', quality: '20201', ekey: 'xyz123' },
    ]);
  });

  test('returns null for unrecognized filenames', async () => {
    await expect(importKWMv2KeysFromFile(new File([], 'notes.txt'))).resolves.toBeNull();
  });
});
