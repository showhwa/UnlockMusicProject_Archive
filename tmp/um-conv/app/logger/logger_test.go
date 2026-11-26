package logger

import (
	"os"
	"path/filepath"
	"testing"

	"git.um-react.app/um/um-conv/app/configdir"
)

func TestPathAndSync_Uninitialized(t *testing.T) {
	Close()

	if err := Sync(); err != nil {
		t.Fatalf("Sync() when uninitialized = %v, want nil", err)
	}

	got, err := Path()
	if err != nil {
		t.Fatalf("Path() error = %v", err)
	}
	want, err := configdir.LogPath()
	if err != nil {
		t.Fatalf("configdir.LogPath() error = %v", err)
	}
	if got != want {
		t.Fatalf("Path() = %q, want %q", got, want)
	}
}

func TestPathAndSync_WithActiveFile(t *testing.T) {
	Close()

	logPath := filepath.Join(t.TempDir(), "custom.log")
	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(Close)

	mu.Lock()
	file = f
	mu.Unlock()

	got, err := Path()
	if err != nil {
		t.Fatalf("Path() error = %v", err)
	}
	if got != f.Name() {
		t.Fatalf("Path() = %q, want %q", got, f.Name())
	}

	if _, err := f.WriteString("log line\n"); err != nil {
		t.Fatal(err)
	}
	if err := Sync(); err != nil {
		t.Fatalf("Sync() error = %v", err)
	}
}
