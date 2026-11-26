import { AACEncoder, AudioQuality, ExistingOutputMode, OGGEncoder, OutputTarget } from '~protocol';

export const SETTINGS_SECTIONS = [
  { id: 'general', label: '常规' },
  { id: 'ffmpeg', label: '编码' },
  { id: 'decrypt', label: '解锁' },
  { id: 'advanced', label: '高级' },
  { id: 'about', label: '关于' },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

export const SETTINGS_SECTION_IDS: readonly SettingsSectionId[] = SETTINGS_SECTIONS.map(
  (s) => s.id,
);

export const OUTPUT_TARGETS = [
  { value: OutputTarget.OutputTargetSource, text: '源目录' },
  { value: OutputTarget.OutputTargetCustom, text: '指定目录' },
] as const;

export const EXISTING_OUTPUT_MODES = [
  { value: ExistingOutputMode.ExistingOutputSkip, text: '跳过', hint: '跳过转码' },
  {
    value: ExistingOutputMode.ExistingOutputRename,
    text: '改名',
    hint: '添加后缀，如“文件_1.mp3”',
  },
  {
    value: ExistingOutputMode.ExistingOutputOverwrite,
    text: '覆盖',
    hint: '直接覆盖已存在的输出目标文件',
  },
] as const;

export const AUDIO_QUALITIES = [
  { value: AudioQuality.AudioQualityHigh, text: '高音质', hint: '音质最好，保留更多细节' },
  { value: AudioQuality.AudioQualityMedium, text: '中音质', hint: '音质与文件大小均衡' },
  { value: AudioQuality.AudioQualityLow, text: '低音质', hint: '文件体积最小，也不是不能听' },
] as const;

export const AUDIO_QUALITY_FIELD_HINT = '码率越高，文件越大。同编码器下，码率越高，音质越好。';

export const AUDIO_QUALITY_FIELD_HINT_LOSSLESS = '无损编码时，音频质量参数不生效。';

export const AAC_ENCODERS = [
  {
    value: AACEncoder.AACEncoderAuto,
    text: '自动选择',
    hint: '不确定用哪个时选此项',
  },
  {
    value: AACEncoder.AACEncoderFDK,
    text: AACEncoder.AACEncoderFDK,
    hint: '高质量 AAC，需 FFmpeg 支持 FDK',
  },
  {
    value: AACEncoder.AACEncoderAAC,
    text: AACEncoder.AACEncoderAAC,
    hint: '兼容性更好的标准 AAC',
  },
] as const;

export const OGG_ENCODERS = [
  {
    value: OGGEncoder.OGGEncoderAuto,
    text: '自动选择',
    hint: '不确定用哪个时选此项',
  },
  {
    value: OGGEncoder.OGGEncoderOpus,
    text: OGGEncoder.OGGEncoderOpus,
    hint: '同码率下音质更好',
  },
  {
    value: OGGEncoder.OGGEncoderVorbis,
    text: OGGEncoder.OGGEncoderVorbis,
    hint: '兼容性更好的经典编码',
  },
] as const;

export function settingsSectionLabel(id: SettingsSectionId): string {
  return SETTINGS_SECTIONS.find((s) => s.id === id)?.label ?? id;
}
