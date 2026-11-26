package settingstore

import (
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func sampleSettings() protocol.Settings {
	return protocol.Settings{
		OutputFormat:             "mp3_cbr",
		OutputTarget:             protocol.OutputTargetSource,
		OutputDir:                "/old",
		AudioQuality:             protocol.AudioQualityHigh,
		DeleteSourceAfterConvert: true,
		ExistingOutputMode:       protocol.ExistingOutputSkip,
		Binaries: protocol.BinariesSettings{
			UmCliRs:     "um_cli_rs.exe",
			QmpcMmkvCli: "qmpc-mmkv-cli.exe",
		},
		FFmpeg: protocol.FFmpegSettings{
			Path:          "",
			AACEncoder:    protocol.AACEncoderAuto,
			AACFdkWithVBR: false,
			OGGEncoder:    protocol.OGGEncoderAuto,
		},
	}
}

func testFormatIDs() map[string]struct{} {
	m := make(map[string]struct{}, len(outputProfiles))
	for _, p := range outputProfiles {
		m[p.ID] = struct{}{}
	}
	return m
}

func TestMergeSettingsPatch_PartialBoolAndEmptyString(t *testing.T) {
	current := sampleSettings()

	next, err := mergeSettingsPatch(current, map[string]any{
		"deleteSourceAfterConvert": false,
		"outputDir":                "",
	}, testFormatIDs())
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	if next.DeleteSourceAfterConvert {
		t.Fatal("expected deleteSourceAfterConvert=false")
	}
	if next.OutputDir != "" {
		t.Fatalf("expected empty outputDir, got %q", next.OutputDir)
	}
	if next.OutputFormat != "mp3_cbr" {
		t.Fatalf("outputFormat should be unchanged, got %q", next.OutputFormat)
	}
	if next.AudioQuality != protocol.AudioQualityHigh {
		t.Fatalf("audioQuality should be unchanged, got %d", next.AudioQuality)
	}
}

func TestMergeSettingsPatch_NestedFFmpeg(t *testing.T) {
	current := sampleSettings()
	next, err := mergeSettingsPatch(current, map[string]any{
		"ffmpeg": map[string]any{
			"aacEncoder": "aac",
		},
	}, testFormatIDs())
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	if next.FFmpeg.AACEncoder != protocol.AACEncoderAAC {
		t.Fatalf("aacEncoder=%q", next.FFmpeg.AACEncoder)
	}
	if next.FFmpeg.OGGEncoder != protocol.OGGEncoderAuto {
		t.Fatalf("oggEncoder should be unchanged, got %q", next.FFmpeg.OGGEncoder)
	}
}

func TestMergeSettingsPatch_AllowAdbKeysLeavesPath(t *testing.T) {
	current := sampleSettings()
	current.Binaries.Adb = `C:\Tools\adb.exe`
	next, err := mergeSettingsPatch(current, map[string]any{
		"bin": map[string]any{
			"allowAdbKeys": true,
		},
	}, testFormatIDs())
	if err != nil {
		t.Fatalf("merge: %v", err)
	}
	if !next.Binaries.AllowAdbKeys {
		t.Fatal("expected allowAdbKeys=true")
	}
	if next.Binaries.Adb != current.Binaries.Adb {
		t.Fatalf("adb path = %q, want %q", next.Binaries.Adb, current.Binaries.Adb)
	}
	if next.Binaries.UmCliRs != "um_cli_rs.exe" || next.Binaries.QmpcMmkvCli != "qmpc-mmkv-cli.exe" {
		t.Fatalf("other binary paths changed: %+v", next.Binaries)
	}
}

func TestMergeSettingsPatch_IllegalFormatRejected(t *testing.T) {
	current := sampleSettings()
	_, err := mergeSettingsPatch(current, map[string]any{
		"outputFormat": "not-a-profile",
	}, testFormatIDs())
	if err == nil {
		t.Fatal("expected validation error")
	}
	// current must remain usable as merge returns a copy
	if current.OutputFormat != "mp3_cbr" {
		t.Fatalf("current mutated: %q", current.OutputFormat)
	}
}

func TestMergeSettingsPatch_ParallelFieldsIndividually(t *testing.T) {
	base := sampleSettings()
	base.EnableParallel = true
	base.Parallel = 4

	t.Run("enableParallel only", func(t *testing.T) {
		next, err := mergeSettingsPatch(base, map[string]any{
			"enableParallel": false,
		}, testFormatIDs())
		if err != nil {
			t.Fatalf("merge: %v", err)
		}
		want := base
		want.EnableParallel = false
		if next != want {
			t.Fatalf("got %+v, want %+v", next, want)
		}
	})

	t.Run("parallel only", func(t *testing.T) {
		next, err := mergeSettingsPatch(base, map[string]any{
			"parallel": 8,
		}, testFormatIDs())
		if err != nil {
			t.Fatalf("merge: %v", err)
		}
		want := base
		want.Parallel = 8
		if next != want {
			t.Fatalf("got %+v, want %+v", next, want)
		}
	})
}
