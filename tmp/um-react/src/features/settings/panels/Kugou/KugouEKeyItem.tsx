import { kugouDeleteKey, kugouUpdateKey } from '../../settingsSlice';
import { useAppDispatch } from '~/hooks';
import { memo } from 'react';
import { StagingKugouKey } from '../../keyFormats';
import { KeyInput } from '~/components/KeyInput';

export const KugouEKeyItem = memo(({ id, ekey, audioHash, i }: StagingKugouKey & { i: number }) => {
  const dispatch = useAppDispatch();

  const ekeyLen = ekey.length;
  const isValidEKey = ekeyLen === 364 || ekeyLen === 704;

  return (
    <KeyInput
      name={audioHash}
      value={ekey}
      isValidKey={isValidEKey}
      onSetName={(value) => dispatch(kugouUpdateKey({ id, field: 'audioHash', value }))}
      onSetValue={(value) => dispatch(kugouUpdateKey({ id, field: 'ekey', value }))}
      onDelete={() => dispatch(kugouDeleteKey({ id }))}
      sequence={i + 1}
      namePlaceholder="音频哈希。不建议手动填写。"
      valuePlaceholder="密钥，通常包含 364 或 704 位字符，没有空格。"
    />
  );
});
