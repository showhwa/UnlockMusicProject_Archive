package protocol

import "fmt"

// ValidateSettings checks a fully merged Settings document.
// knownFormats may be nil to skip outputFormat membership checks.
func ValidateSettings(s Settings, knownFormats map[string]struct{}) error {
	if !s.OutputTarget.IsValid() {
		return fmt.Errorf("无效的输出目标: %q", s.OutputTarget)
	}
	if !s.ExistingOutputMode.IsValid() {
		return fmt.Errorf("无效的已存在文件处理方式: %q", s.ExistingOutputMode)
	}
	if !s.AudioQuality.IsValid() {
		return fmt.Errorf("无效的音质等级: %d", s.AudioQuality)
	}
	if !s.FFmpeg.AACEncoder.IsValid() {
		return fmt.Errorf("无效的 AAC 编码器: %q", s.FFmpeg.AACEncoder)
	}
	if !s.FFmpeg.OGGEncoder.IsValid() {
		return fmt.Errorf("无效的 OGG 编码器: %q", s.FFmpeg.OGGEncoder)
	}

	if knownFormats != nil {
		if s.OutputFormat == "" {
			return fmt.Errorf("输出格式不能为空")
		}
		if _, ok := knownFormats[s.OutputFormat]; !ok {
			return fmt.Errorf("无效的输出格式: %q", s.OutputFormat)
		}
	}

	return nil
}

// RepairSettings normalizes s and replaces each invalid field with defaults' value.
// Unconstrained strings/bools are kept as-is after Normalize.
func RepairSettings(s *Settings, defaults Settings, knownFormats map[string]struct{}) {
	NormalizeSettings(s)

	if !s.OutputTarget.IsValid() {
		s.OutputTarget = defaults.OutputTarget
	}
	if !s.ExistingOutputMode.IsValid() {
		s.ExistingOutputMode = defaults.ExistingOutputMode
	}
	if !s.AudioQuality.IsValid() {
		s.AudioQuality = defaults.AudioQuality
	}
	if !s.FFmpeg.AACEncoder.IsValid() {
		s.FFmpeg.AACEncoder = defaults.FFmpeg.AACEncoder
	}
	if !s.FFmpeg.OGGEncoder.IsValid() {
		s.FFmpeg.OGGEncoder = defaults.FFmpeg.OGGEncoder
	}

	if knownFormats != nil {
		if _, ok := knownFormats[s.OutputFormat]; !ok {
			s.OutputFormat = defaults.OutputFormat
		}
	}
}
