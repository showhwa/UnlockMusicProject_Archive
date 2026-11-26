package protocol

import (
	"os"
	"strings"
)

type AACEncoder string

const (
	AACEncoderAuto AACEncoder = "auto"
	AACEncoderFDK  AACEncoder = "libfdk_aac"
	AACEncoderAAC  AACEncoder = "aac"
)

func (a AACEncoder) IsSet() bool {
	return a == AACEncoderFDK || a == AACEncoderAAC
}

// IsValid reports whether a is auto or a supported AAC encoder.
func (a AACEncoder) IsValid() bool {
	return a == AACEncoderAuto || a.IsSet()
}

type OGGEncoder string

const (
	OGGEncoderAuto   OGGEncoder = "auto"
	OGGEncoderOpus   OGGEncoder = "libopus"
	OGGEncoderVorbis OGGEncoder = "libvorbis"
)

func (o OGGEncoder) IsSet() bool {
	return o == OGGEncoderOpus || o == OGGEncoderVorbis
}

// IsValid reports whether o is auto or a supported OGG encoder.
func (o OGGEncoder) IsValid() bool {
	return o == OGGEncoderAuto || o.IsSet()
}

type FFmpegSettings struct {
	// Path to the ffmpeg binary
	Path string `json:"path" toml:"path"`

	AACEncoder AACEncoder `json:"aacEncoder" toml:"aac_encoder"`
	// FDK use VBR for AAC encoded with `libfdk_aac`.
	AACFdkWithVBR bool `json:"aacFdkWithVBR" toml:"aac_fdk_with_vbr"`

	OGGEncoder OGGEncoder `json:"oggEncoder" toml:"ogg_encoder"`
}

type OutputTarget string

const (
	OutputTargetSource OutputTarget = "source"
	OutputTargetCustom OutputTarget = "custom"
)

// IsValid reports whether t is a supported output target.
func (t OutputTarget) IsValid() bool {
	return t == OutputTargetSource || t == OutputTargetCustom
}

type ExistingOutputMode string

const (
	ExistingOutputSkip      ExistingOutputMode = "skip"
	ExistingOutputRename    ExistingOutputMode = "rename"
	ExistingOutputOverwrite ExistingOutputMode = "overwrite"
)

// IsValid reports whether m is a supported existing-output mode.
func (m ExistingOutputMode) IsValid() bool {
	return m == ExistingOutputSkip || m == ExistingOutputRename || m == ExistingOutputOverwrite
}

type BinariesSettings struct {
	UmCliRs      string `json:"um_cli_rs" toml:"um_cli_rs"`
	QmpcMmkvCli  string `json:"qmpc-mmkv-cli" toml:"qmpc-mmkv-cli"`
	Adb          string `json:"adb" toml:"adb"`
	AllowAdbKeys bool   `json:"allowAdbKeys" toml:"allow_adb_keys"`
}

// Settings 应用设置
type Settings struct {
	OutputFormat             string             `json:"outputFormat" toml:"output_format"`
	OutputTarget             OutputTarget       `json:"outputTarget" toml:"output_target"`
	OutputDir                string             `json:"outputDir" toml:"output_dir"`
	TempDir                  string             `json:"tempDir" toml:"temp_dir"`
	AudioQuality             AudioQuality       `json:"audioQuality" toml:"audio_quality"`
	DeleteSourceAfterConvert bool               `json:"deleteSourceAfterConvert" toml:"delete_source_after_convert"`
	ExistingOutputMode       ExistingOutputMode `json:"existingOutputMode" toml:"existing_output_mode"`
	EnableParallel           bool               `json:"enableParallel" toml:"enable_parallel"`
	Parallel                 int                `json:"parallel" toml:"parallel"`

	Binaries BinariesSettings `json:"bin" toml:"bin"`

	FFmpeg FFmpegSettings `json:"ffmpeg" toml:"ffmpeg"`
}

// SettingsState is an authoritative settings snapshot with a monotonic revision.
// The revision changes only after settings have been validated and persisted.
type SettingsState struct {
	Revision uint64   `json:"revision"`
	Settings Settings `json:"settings"`
}

// ResolveTempDir returns the effective temp directory: trimmed TempDir, or os.TempDir when empty.
func ResolveTempDir(s *Settings) string {
	if s == nil {
		return os.TempDir()
	}
	if dir := strings.TrimSpace(s.TempDir); dir != "" {
		return dir
	}
	return os.TempDir()
}

// NormalizeSettings trims string fields in place.
func NormalizeSettings(s *Settings) {
	s.OutputFormat = strings.TrimSpace(s.OutputFormat)
	s.OutputDir = strings.TrimSpace(s.OutputDir)
	s.TempDir = strings.TrimSpace(s.TempDir)
	s.Binaries.UmCliRs = strings.TrimSpace(s.Binaries.UmCliRs)
	s.Binaries.QmpcMmkvCli = strings.TrimSpace(s.Binaries.QmpcMmkvCli)
	s.Binaries.Adb = strings.TrimSpace(s.Binaries.Adb)
	s.FFmpeg.Path = strings.TrimSpace(s.FFmpeg.Path)
	s.FFmpeg.AACEncoder = AACEncoder(strings.TrimSpace(string(s.FFmpeg.AACEncoder)))
	s.FFmpeg.OGGEncoder = OGGEncoder(strings.TrimSpace(string(s.FFmpeg.OGGEncoder)))
	s.OutputTarget = OutputTarget(strings.TrimSpace(string(s.OutputTarget)))
	s.ExistingOutputMode = ExistingOutputMode(strings.TrimSpace(string(s.ExistingOutputMode)))
}
