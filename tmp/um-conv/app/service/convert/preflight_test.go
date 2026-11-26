package convert

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestPrepareSettingsForConvertDoesNotRequireQmpcMmkvCli(t *testing.T) {
	dir := t.TempDir()
	ffmpeg := writePlaceholderExecutable(t, dir, "ffmpeg.exe")
	umCliRs := writePlaceholderExecutable(t, dir, "um_cli_rs.exe")
	missingQmpc := filepath.Join(dir, "missing-qmpc-mmkv-cli.exe")
	settings := protocol.Settings{
		OutputTarget: protocol.OutputTargetSource,
		FFmpeg:       protocol.FFmpegSettings{Path: ffmpeg},
		Binaries: protocol.BinariesSettings{
			UmCliRs:     umCliRs,
			QmpcMmkvCli: missingQmpc,
		},
	}

	got, err := prepareSettingsForConvert(settings, true)
	if err != nil {
		t.Fatal(err)
	}
	if got.Binaries.UmCliRs != umCliRs {
		t.Fatalf("um_cli_rs path = %q, want %q", got.Binaries.UmCliRs, umCliRs)
	}
	if got.Binaries.QmpcMmkvCli != missingQmpc {
		t.Fatalf("qmpc-mmkv-cli path changed to %q", got.Binaries.QmpcMmkvCli)
	}
}

func TestPrepareSettingsForConvertFindsDefaultUmCliRsOnPath(t *testing.T) {
	dir := t.TempDir()
	name := "um_cli_rs"
	if runtime.GOOS == "windows" {
		name += ".exe"
	}
	umCliRs := writePlaceholderExecutable(t, dir, name)
	t.Setenv("PATH", dir)
	settings := protocol.Settings{
		OutputTarget: protocol.OutputTargetSource,
		FFmpeg:       protocol.FFmpegSettings{Path: writePlaceholderExecutable(t, dir, "ffmpeg.exe")},
	}

	got, err := prepareSettingsForConvert(settings, true)
	if err != nil {
		t.Fatal(err)
	}
	if got.Binaries.UmCliRs != umCliRs {
		t.Fatalf("um_cli_rs path = %q, want %q", got.Binaries.UmCliRs, umCliRs)
	}
}

func TestDecryptToTemporaryRemovesPartialOutputOnFailure(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "partial-output")
	algo := &failingDecryptAlgo{content: []byte("partial")}

	_, err := decryptToTemporary(algo, "source.mflac", dest, &protocol.Settings{})
	if err == nil {
		t.Fatal("expected decrypt error")
	}
	if _, statErr := os.Stat(dest); !errors.Is(statErr, os.ErrNotExist) {
		t.Fatalf("partial output still exists or stat failed unexpectedly: %v", statErr)
	}
}

func writePlaceholderExecutable(t *testing.T, dir, name string) string {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, []byte("placeholder"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

type failingDecryptAlgo struct {
	content []byte
}

func (a *failingDecryptAlgo) Decrypt(_ string, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
	if err := os.WriteFile(dest, a.content, 0o644); err != nil {
		return protocol.DecryptResult{}, err
	}
	return protocol.DecryptResult{AudioPath: dest}, errors.New("decrypt failed")
}

func (a *failingDecryptAlgo) GetSupportedExtensions() []string {
	return []string{".test"}
}

func (a *failingDecryptAlgo) DeepProbe(_ context.Context, path string) (bool, error) {
	return protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()), nil
}

func (a *failingDecryptAlgo) PopulateSupportedFormats(map[string][]string) {}
