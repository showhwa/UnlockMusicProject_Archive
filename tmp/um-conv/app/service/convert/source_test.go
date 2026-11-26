package convert

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"
)

func TestEncryptedExtensionsHavePlayerNames(t *testing.T) {
	algorithms := newAlgoRegistry(context.Background(), &protocol.Settings{})
	for ext := range algorithms.exts {
		if playerForPath("song"+ext) == "" {
			t.Fatalf("missing player label for encrypted extension %s", ext)
		}
	}
}

func TestKuwoPlayerLabel(t *testing.T) {
	for _, name := range []string{"song.kwm", "song.KWM"} {
		if got := playerForPath(name); got != "酷我音乐" {
			t.Fatalf("playerForPath(%q) = %q, want %q", name, got, "酷我音乐")
		}
	}
}

func testConvertService(t *testing.T) *ConvertService {
	t.Helper()
	return newQueueTestService(t)
}

func TestFlacHeaderAloneDoesNotClaimKuwo(t *testing.T) {
	path := filepath.Join(t.TempDir(), "song.FLAC")
	if err := os.WriteFile(path, []byte("yeelion-kuwo-tme"), 0o644); err != nil {
		t.Fatal(err)
	}
	if playerForPath(path) != "" {
		t.Fatal("playerForPath must not label every .flac as Kuwo")
	}
	settings := settingstore.Default()
	settings.Binaries.UmCliRs = filepath.Join(t.TempDir(), "missing-um-cli-rs.exe")
	s := &ConvertService{
		store: settingstore.New(settings, filepath.Join(t.TempDir(), "settings.toml")),
		job:   JobState{Status: "idle", Message: idleMessage},
	}
	file := &FileEntry{Path: path, Name: "song.FLAC", Size: "1 B"}
	s.files = []*FileEntry{file}
	s.runSourceProbes(context.Background(), []*FileEntry{file})
	if file.Source.Player != "" {
		t.Fatalf("player = %q, want empty without kuwo -I", file.Source.Player)
	}
}

func TestPlainFlacProbeDoesNotClaimKuwo(t *testing.T) {
	path := filepath.Join(t.TempDir(), "plain.flac")
	if err := os.WriteFile(path, []byte("fLaC\x00\x00\x00\x22extra"), 0o644); err != nil {
		t.Fatal(err)
	}
	settings := settingstore.Default()
	settings.Binaries.UmCliRs = filepath.Join(t.TempDir(), "missing-um-cli-rs.exe")
	s := &ConvertService{
		store: settingstore.New(settings, filepath.Join(t.TempDir(), "settings.toml")),
		job:   JobState{Status: "idle", Message: idleMessage},
	}
	file := &FileEntry{Path: path, Name: "plain.flac"}
	s.files = []*FileEntry{file}
	s.runSourceProbes(context.Background(), []*FileEntry{file})
	if file.Source.Player != "" {
		t.Fatalf("player = %q, want empty", file.Source.Player)
	}
}

func TestPlainFileHasNoPlayerOnIngest(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "plain.wav")
	s := testConvertService(t)
	s.ingestEntries([]FileEntry{{Path: path, Name: "plain.wav", Size: "1 B"}})
	file := s.GetState().Files[0]
	if file.Source.Player != "" {
		t.Fatalf("expected empty player, got %q", file.Source.Player)
	}
}

func TestApplySourceProbeIgnoresRemovedEntry(t *testing.T) {
	dir := t.TempDir()
	s := testConvertService(t)
	s.ingestEntries([]FileEntry{{Path: filepath.Join(dir, "a.flac"), Name: "a.flac"}})
	s.mu.Lock()
	original := s.files[0]
	s.mu.Unlock()
	_ = s.RemoveFiles([]string{original.Path})
	s.ingestEntries([]FileEntry{{Path: filepath.Join(dir, "a.flac"), Name: "a.flac"}})

	before := s.GetState().Revision
	s.applySourceProbe(original, "FLAC", 1411)
	after := s.GetState()
	if after.Revision != before || after.Files[0].Source.OK {
		t.Fatalf("stale probe must not update the new entry: %+v", after.Files[0].Source)
	}
}

func TestServiceShutdownCancelsSourceProbes(t *testing.T) {
	dir := t.TempDir()
	settings := settingstore.Default()
	settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")
	s := NewConvertService(settingstore.New(settings, filepath.Join(dir, "settings.toml")))

	started := make(chan struct{}, 1)
	probeCancelled := make(chan error, 1)
	s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{&stubQueueAlgo{
			deepProbe: func(ctx context.Context, _ string) (bool, error) {
				select {
				case started <- struct{}{}:
				default:
				}
				<-ctx.Done()
				probeCancelled <- ctx.Err()
				return false, ctx.Err()
			},
		}}
	})

	s.ingestEntries([]FileEntry{{Path: filepath.Join(dir, "song.flac"), Name: "song.flac"}})

	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("source probe did not start")
	}

	if err := s.ServiceShutdown(); err != nil {
		t.Fatal(err)
	}

	select {
	case err := <-probeCancelled:
		if err != context.Canceled {
			t.Fatalf("probe context err = %v, want context.Canceled", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("ServiceShutdown did not cancel running source probe")
	}
}
