import { PiFileAudio, PiHash } from 'react-icons/pi';
import { kwm2DeleteKey, kwm2UpdateKey } from '../../settingsSlice';
import { useAppDispatch } from '~/hooks';
import { memo } from 'react';
import { StagingKWMv2Key } from '../../keyFormats';
import { KeyInput } from '~/components/KeyInput';

export const KWMv2EKeyItem = memo(({ id, ekey, quality, rid, i }: StagingKWMv2Key & { i: number }) => {
  const dispatch = useAppDispatch();

  const ekeyLen = ekey.length;
  const isValidEKey = ekeyLen === 364 || ekeyLen === 704;

  return (
    <KeyInput
      name={rid}
      quality={quality}
      value={ekey}
      isValidKey={isValidEKey}
      onSetName={(value) => dispatch(kwm2UpdateKey({ id, field: 'rid', value }))}
      onSetQuality={(value) => dispatch(kwm2UpdateKey({ id, field: 'quality', value }))}
      onSetValue={(value) => dispatch(kwm2UpdateKey({ id, field: 'ekey', value }))}
      onDelete={() => dispatch(kwm2DeleteKey({ id }))}
      sequence={i + 1}
      nameLabel={
        <>
          ID
          <PiHash className="hidden md:inline-block" />
        </>
      }
      qualityLabel={
        <>
          质量 <PiFileAudio className="hidden md:inline-block" />
        </>
      }
      namePlaceholder="音频哈希。不建议手动填写。"
      qualityPlaceholder="比特率 ID"
      valuePlaceholder="密钥，通常包含 364 或 704 位字符，没有空格。"
    />
  );
});
