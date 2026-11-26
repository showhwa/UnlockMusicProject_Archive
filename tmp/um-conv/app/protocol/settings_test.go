package protocol

import "testing"

func TestValidateSettings(t *testing.T) {
	known := map[string]struct{}{"mp3_cbr": {}, "flac": {}}
	base := Settings{
		OutputFormat:       "mp3_cbr",
		OutputTarget:       OutputTargetSource,
		ExistingOutputMode: ExistingOutputSkip,
		AudioQuality:       AudioQualityHigh,
		FFmpeg: FFmpegSettings{
			AACEncoder:    AACEncoderAuto,
			AACFdkWithVBR: false,
			OGGEncoder:    OGGEncoderAuto,
		},
	}

	if err := ValidateSettings(base, known); err != nil {
		t.Fatalf("valid settings: %v", err)
	}

	bad := base
	bad.OutputFormat = "nope"
	if err := ValidateSettings(bad, known); err == nil {
		t.Fatal("expected invalid outputFormat error")
	}

	bad = base
	bad.OutputTarget = "elsewhere"
	if err := ValidateSettings(bad, known); err == nil {
		t.Fatal("expected invalid outputTarget error")
	}

	bad = base
	bad.ExistingOutputMode = "delete"
	if err := ValidateSettings(bad, known); err == nil {
		t.Fatal("expected invalid existingOutputMode error")
	}

	bad = base
	bad.AudioQuality = 9
	if err := ValidateSettings(bad, known); err == nil {
		t.Fatal("expected invalid audioQuality error")
	}

	bad = base
	bad.FFmpeg.AACEncoder = "x"
	if err := ValidateSettings(bad, known); err == nil {
		t.Fatal("expected invalid aacEncoder error")
	}
}

func TestRepairSettings_PerField(t *testing.T) {
	known := map[string]struct{}{"mp3_cbr": {}, "flac": {}}
	defaults := Settings{
		OutputFormat:       "mp3_cbr",
		OutputTarget:       OutputTargetSource,
		ExistingOutputMode: ExistingOutputSkip,
		AudioQuality:       AudioQualityHigh,
		FFmpeg: FFmpegSettings{
			AACEncoder:    AACEncoderAuto,
			AACFdkWithVBR: false,
			OGGEncoder:    OGGEncoderAuto,
		},
	}
	s := defaults
	s.OutputFormat = "nope"
	s.OutputTarget = OutputTargetCustom
	s.ExistingOutputMode = "delete"
	s.AudioQuality = 9
	s.DeleteSourceAfterConvert = true
	s.FFmpeg.AACEncoder = "x"
	s.FFmpeg.AACFdkWithVBR = true
	s.FFmpeg.OGGEncoder = OGGEncoderOpus

	RepairSettings(&s, defaults, known)

	if s.OutputFormat != "mp3_cbr" {
		t.Fatalf("outputFormat=%q", s.OutputFormat)
	}
	if s.OutputTarget != OutputTargetCustom {
		t.Fatalf("outputTarget=%q", s.OutputTarget)
	}
	if s.ExistingOutputMode != ExistingOutputSkip {
		t.Fatalf("existingOutputMode=%q", s.ExistingOutputMode)
	}
	if s.AudioQuality != AudioQualityHigh {
		t.Fatalf("audioQuality=%d", s.AudioQuality)
	}
	if !s.DeleteSourceAfterConvert {
		t.Fatal("deleteSourceAfterConvert should be kept")
	}
	if s.FFmpeg.AACEncoder != AACEncoderAuto {
		t.Fatalf("aacEncoder=%q", s.FFmpeg.AACEncoder)
	}
	if !s.FFmpeg.AACFdkWithVBR {
		t.Fatal("aacFdkWithVBR should be kept")
	}
	if s.FFmpeg.OGGEncoder != OGGEncoderOpus {
		t.Fatalf("oggEncoder=%q", s.FFmpeg.OGGEncoder)
	}
	if err := ValidateSettings(s, known); err != nil {
		t.Fatalf("repaired should validate: %v", err)
	}
}

func TestNormalizeSettings(t *testing.T) {
	s := Settings{
		OutputFormat:       "  flac  ",
		OutputDir:          " /tmp/out ",
		TempDir:            " /tmp/um ",
		OutputTarget:       OutputTarget(" custom "),
		ExistingOutputMode: ExistingOutputMode(" rename "),
		FFmpeg: FFmpegSettings{
			Path:       " /usr/bin/ffmpeg ",
			AACEncoder: AACEncoder(" aac "),
			OGGEncoder: OGGEncoder(" libopus "),
		},
		Binaries: BinariesSettings{
			UmCliRs:     " a.exe ",
			QmpcMmkvCli: " b.exe ",
			Adb:         " adb.exe ",
		},
	}
	NormalizeSettings(&s)
	if s.OutputFormat != "flac" || s.OutputDir != "/tmp/out" || s.TempDir != "/tmp/um" {
		t.Fatalf("trim failed: %+v", s)
	}
	if s.OutputTarget != OutputTargetCustom {
		t.Fatalf("outputTarget=%q", s.OutputTarget)
	}
	if s.ExistingOutputMode != ExistingOutputRename {
		t.Fatalf("existingOutputMode=%q", s.ExistingOutputMode)
	}
	if s.FFmpeg.Path != "/usr/bin/ffmpeg" || s.FFmpeg.AACEncoder != AACEncoderAAC {
		t.Fatalf("ffmpeg trim failed: %+v", s.FFmpeg)
	}
	if s.Binaries.Adb != "adb.exe" {
		t.Fatalf("adb=%q", s.Binaries.Adb)
	}
}

func TestResolveTempDir(t *testing.T) {
	if got := ResolveTempDir(nil); got == "" {
		t.Fatal("nil settings should fall back to os.TempDir")
	}
	s := &Settings{TempDir: "  "}
	if got := ResolveTempDir(s); got == "" {
		t.Fatal("blank TempDir should fall back to os.TempDir")
	}
	s.TempDir = " /custom/tmp "
	if got := ResolveTempDir(s); got != "/custom/tmp" {
		t.Fatalf("got %q", got)
	}
}
