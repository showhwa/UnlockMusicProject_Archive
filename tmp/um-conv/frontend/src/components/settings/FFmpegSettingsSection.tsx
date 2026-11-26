import { Field, Option, Switch } from '@fluentui/react-components';
import { Dropdown } from '@/components/Dropdown';
import { DropdownOptionLabel } from '@/components/DropdownOptionLabel';
import { useSetting } from '@/hooks/useConvertStore';
import { useOptimisticSetting } from '@/hooks/useOptimisticSetting';
import { AAC_ENCODERS, OGG_ENCODERS } from '@/settings/labels';
import { AACEncoder, OGGEncoder } from '~protocol';
import { FFmpegField } from './FFmpegField';
import { SettingsSection } from './SettingsSection';

export function FFmpegSettingsSection() {
  const aacEncoder = useOptimisticSetting(
    useSetting((settings) => settings.ffmpeg.aacEncoder),
    (value) => ({ ffmpeg: { aacEncoder: value } }),
  );
  const aacFdkWithVBR = useOptimisticSetting(
    useSetting((settings) => settings.ffmpeg.aacFdkWithVBR),
    (value) => ({ ffmpeg: { aacFdkWithVBR: value } }),
  );
  const oggEncoder = useOptimisticSetting(
    useSetting((settings) => settings.ffmpeg.oggEncoder),
    (value) => ({ ffmpeg: { oggEncoder: value } }),
  );

  return (
    <SettingsSection id="ffmpeg">
      <FFmpegField />

      <Field label="AAC 编码器">
        <Dropdown
          value={aacEncoder.value}
          onOptionSelect={(_, data) => {
            if (!data.optionValue) return;
            void aacEncoder.commit(data.optionValue as AACEncoder);
          }}
        >
          {AAC_ENCODERS.map((item) => (
            <Option key={item.value} value={item.value} text={item.text}>
              <DropdownOptionLabel text={item.text} hint={item.hint} />
            </Option>
          ))}
        </Dropdown>
      </Field>

      <Switch
        label="FDK 编码器：使用动态码率 (VBR)"
        checked={aacFdkWithVBR.value}
        onChange={(_, data) => void aacFdkWithVBR.commit(Boolean(data.checked))}
      />

      <Field label="OGG 编码器" hint="注意：苹果设备原生不支持 ogg 格式，需使用第三方播放器。">
        <Dropdown
          value={oggEncoder.value}
          onOptionSelect={(_, data) => {
            if (!data.optionValue) return;
            void oggEncoder.commit(data.optionValue as OGGEncoder);
          }}
        >
          {OGG_ENCODERS.map((item) => (
            <Option key={item.value} value={item.value} text={item.text}>
              <DropdownOptionLabel text={item.text} hint={item.hint} />
            </Option>
          ))}
        </Dropdown>
      </Field>
    </SettingsSection>
  );
}
