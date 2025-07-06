import { qmc2DeleteKey, qmc2UpdateKey } from '../../settingsSlice';
import { useAppDispatch } from '~/hooks';
import { memo } from 'react';
import { KeyInput } from '~/components/KeyInput.tsx';

export const QMCv2EKeyItem = memo(({ id, name, ekey, i }: { id: string; name: string; ekey: string; i: number }) => {
  const dispatch = useAppDispatch();

  const ekeyLen = ekey.length;
  const isValidEKey = ekeyLen === 364 || ekeyLen === 704;

  return (
    <KeyInput
      name={name}
      value={ekey}
      isValidKey={isValidEKey}
      onSetName={(value) => dispatch(qmc2UpdateKey({ id, field: 'name', value }))}
      onSetValue={(value) => dispatch(qmc2UpdateKey({ id, field: 'ekey', value }))}
      onDelete={() => dispatch(qmc2DeleteKey({ id }))}
      sequence={i + 1}
      namePlaceholder="文件名，包括后缀名。如 “AAA - BBB.mflac”"
      valuePlaceholder="密钥，通常包含 364 或 704 位字符，没有空格。"
    />
  );
});
