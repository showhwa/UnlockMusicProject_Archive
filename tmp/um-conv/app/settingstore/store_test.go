package settingstore

import (
	"os"
	"path/filepath"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestLoadFile_MissingUsesDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	got := LoadFile(path, testFormatIDs())
	want := Default()
	if got != want {
		t.Fatalf("got %+v want %+v", got, want)
	}
}

func TestLoadFile_CorruptUsesDefault(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	if err := os.WriteFile(path, []byte("[[[not toml"), 0o644); err != nil {
		t.Fatal(err)
	}
	got := LoadFile(path, testFormatIDs())
	if got != Default() {
		t.Fatalf("got %+v", got)
	}
}

func TestLoadFile_PartialInvalidRepaired(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	content := `
output_format = "nope"
output_target = "source"
audio_quality = 9
delete_source_after_convert = true

[ffmpeg]
aac_encoder = "x"
aac_fdk_with_vbr = true
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got := LoadFile(path, testFormatIDs())
	def := Default()
	if got.OutputFormat != def.OutputFormat {
		t.Fatalf("outputFormat=%q", got.OutputFormat)
	}
	if got.OutputTarget != protocol.OutputTargetSource {
		t.Fatalf("outputTarget=%q", got.OutputTarget)
	}
	if got.AudioQuality != def.AudioQuality {
		t.Fatalf("audioQuality=%d", got.AudioQuality)
	}
	if !got.DeleteSourceAfterConvert {
		t.Fatal("deleteSourceAfterConvert should stay true")
	}
	if got.ExistingOutputMode != def.ExistingOutputMode {
		t.Fatalf("existingOutputMode=%q", got.ExistingOutputMode)
	}
	if got.FFmpeg.AACEncoder != def.FFmpeg.AACEncoder {
		t.Fatalf("aacEncoder=%q", got.FFmpeg.AACEncoder)
	}
	if !got.FFmpeg.AACFdkWithVBR {
		t.Fatal("aacFdkWithVBR should stay true")
	}
	if got.FFmpeg.OGGEncoder != def.FFmpeg.OGGEncoder {
		t.Fatalf("oggEncoder=%q", got.FFmpeg.OGGEncoder)
	}
}

func TestLoadFile_LegacyWithoutParallelFields(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	content := `output_format = "mp3_cbr"
output_target = "source"
`
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got := LoadFile(path, testFormatIDs())
	if !got.EnableParallel {
		t.Fatal("EnableParallel should default to true for legacy config")
	}
	if got.Parallel != 0 {
		t.Fatalf("Parallel=%d want 0", got.Parallel)
	}
}

func TestSaveAndLoad_RoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	src := Default()
	src.OutputFormat = "flac"
	src.AudioQuality = protocol.AudioQualityMedium
	src.DeleteSourceAfterConvert = true
	src.ExistingOutputMode = protocol.ExistingOutputOverwrite
	src.FFmpeg.AACFdkWithVBR = true
	src.Binaries.UmCliRs = "um.exe"
	src.Binaries.QmpcMmkvCli = "qmpc.exe"
	src.EnableParallel = false
	src.Parallel = 3

	if err := saveSettings(path, src); err != nil {
		t.Fatal(err)
	}
	got := LoadFile(path, testFormatIDs())
	if got.OutputFormat != "flac" || got.AudioQuality != protocol.AudioQualityMedium {
		t.Fatalf("got %+v", got)
	}
	if !got.DeleteSourceAfterConvert || !got.FFmpeg.AACFdkWithVBR {
		t.Fatalf("got %+v", got)
	}
	if got.ExistingOutputMode != protocol.ExistingOutputOverwrite {
		t.Fatalf("existingOutputMode=%q", got.ExistingOutputMode)
	}
	if got.Binaries != src.Binaries {
		t.Fatalf("bin=%+v", got.Binaries)
	}
	if got.EnableParallel != false || got.Parallel != 3 {
		t.Fatalf("parallel settings: enable=%v parallel=%d", got.EnableParallel, got.Parallel)
	}
}

func TestLoadFile_LegacyUmCliPath(t *testing.T) {
	tests := []struct {
		name       string
		newSetting string
		want       string
	}{
		{name: "legacy only", want: "custom.exe"},
		{name: "new path wins", newSetting: "um_cli_rs = 'new.exe'\n", want: "new.exe"},
		{name: "automatic discovery wins", newSetting: "um_cli_rs = ''\n"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			path := filepath.Join(t.TempDir(), "um-conv.toml")
			content := "[bin]\num_cli = ' custom.exe '\n" + tt.newSetting
			if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
				t.Fatal(err)
			}
			got := LoadFile(path, testFormatIDs())
			if got.Binaries.UmCliRs != tt.want {
				t.Fatalf("binary path = %q, want %q", got.Binaries.UmCliRs, tt.want)
			}
		})
	}
}

func TestPatch_Persists(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	st := New(Default(), path)

	if err := st.Patch(map[string]any{"outputFormat": "flac"}); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty file")
	}
	got := LoadFile(path, testFormatIDs())
	if got.OutputFormat != "flac" {
		t.Fatalf("outputFormat=%q", got.OutputFormat)
	}
}

func TestPatchState_ParallelFieldsIndividually(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	initial := Default()
	initial.OutputFormat = "flac"
	initial.Parallel = 2
	st := New(initial, path)
	before := st.SnapshotState()

	state1, err := st.PatchState(map[string]any{"enableParallel": false})
	if err != nil {
		t.Fatalf("PatchState(enableParallel): %v", err)
	}
	want1 := before.Settings
	want1.EnableParallel = false
	if state1.Revision != before.Revision+1 {
		t.Fatalf("revision = %d, want %d", state1.Revision, before.Revision+1)
	}
	if state1.Settings != want1 {
		t.Fatalf("settings = %+v, want %+v", state1.Settings, want1)
	}
	if persisted := LoadFile(path, testFormatIDs()); persisted != want1 {
		t.Fatalf("persisted = %+v, want %+v", persisted, want1)
	}

	state2, err := st.PatchState(map[string]any{"parallel": 6})
	if err != nil {
		t.Fatalf("PatchState(parallel): %v", err)
	}
	want2 := want1
	want2.Parallel = 6
	if state2.Revision != before.Revision+2 {
		t.Fatalf("revision = %d, want %d", state2.Revision, before.Revision+2)
	}
	if state2.Settings != want2 {
		t.Fatalf("settings = %+v, want %+v", state2.Settings, want2)
	}
	if persisted := LoadFile(path, testFormatIDs()); persisted != want2 {
		t.Fatalf("persisted = %+v, want %+v", persisted, want2)
	}
}

func TestPatch_IllegalDoesNotPersist(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	st := New(Default(), path)

	if err := st.Patch(map[string]any{"outputFormat": "flac"}); err != nil {
		t.Fatal(err)
	}
	before, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}

	err = st.Patch(map[string]any{"outputFormat": "not-a-profile"})
	if err == nil {
		t.Fatal("expected validation error")
	}
	after, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(after) != string(before) {
		t.Fatal("file should be unchanged after illegal patch")
	}
	if st.Snapshot().OutputFormat != "flac" {
		t.Fatalf("memory mutated: %q", st.Snapshot().OutputFormat)
	}
}

func TestEnsureConfigFile_CreatesMissingWithoutBumpingRevision(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "um-conv.toml")
	st := New(Default(), path)
	before := st.SnapshotState()

	got, err := st.EnsureConfigFile()
	if err != nil {
		t.Fatalf("EnsureConfigFile() error = %v", err)
	}
	if got != path {
		t.Fatalf("got %q want %q", got, path)
	}

	after := st.SnapshotState()
	if after.Revision != before.Revision {
		t.Fatalf("revision changed: got %d want %d", after.Revision, before.Revision)
	}
	select {
	case <-st.Changes():
		t.Fatal("unexpected change signal")
	default:
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(data) == 0 {
		t.Fatal("expected non-empty config file")
	}
}

func TestEnsureConfigFile_PreservesExistingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	custom := "# user comment\noutput_format = 'flac'\n"
	if err := os.WriteFile(path, []byte(custom), 0o644); err != nil {
		t.Fatal(err)
	}

	st := New(Default(), path)
	before := st.SnapshotState()

	got, err := st.EnsureConfigFile()
	if err != nil {
		t.Fatalf("EnsureConfigFile() error = %v", err)
	}
	if got != path {
		t.Fatalf("got %q want %q", got, path)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != custom {
		t.Fatalf("existing file overwritten: got %q want %q", string(data), custom)
	}
	if st.SnapshotState().Revision != before.Revision {
		t.Fatalf("revision changed")
	}
}

func TestEnsureConfigFile_RejectsEmptyAndDirectoryPath(t *testing.T) {
	emptyStore := New(Default(), "")
	if _, err := emptyStore.EnsureConfigFile(); err == nil {
		t.Fatal("expected error for empty persistPath")
	}

	dirStore := New(Default(), t.TempDir())
	if _, err := dirStore.EnsureConfigFile(); err == nil {
		t.Fatal("expected error for directory persistPath")
	}
}
