package configdir

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestResolveSettingsPath_PortablePreferred(t *testing.T) {
	dir := t.TempDir()
	portable := filepath.Join(dir, settingsFileName)
	if err := os.WriteFile(portable, []byte("x = 1\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	path, err := resolveSettingsPath(
		func() (string, error) { return filepath.Join(dir, "um-conv"), nil },
		os.Stat,
		os.Open,
	)
	if err != nil {
		t.Fatal(err)
	}
	if path != portable {
		t.Fatalf("got %q want %q", path, portable)
	}
}

func TestResolveSettingsPath_PortableUnreadable(t *testing.T) {
	dir := t.TempDir()
	portable := filepath.Join(dir, settingsFileName)
	if err := os.WriteFile(portable, []byte("x = 1\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	_, err := resolveSettingsPath(
		func() (string, error) { return filepath.Join(dir, "um-conv"), nil },
		os.Stat,
		func(name string) (*os.File, error) {
			return nil, errors.New("permission denied")
		},
	)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestResolveSettingsPath_FallbackUserDir(t *testing.T) {
	dir := t.TempDir()
	path, err := resolveSettingsPath(
		func() (string, error) { return filepath.Join(dir, "um-conv"), nil },
		os.Stat,
		os.Open,
	)
	if err != nil {
		t.Fatal(err)
	}
	want, err := UserSettingsPath()
	if err != nil {
		t.Fatal(err)
	}
	if path != want {
		t.Fatalf("got %q want %q", path, want)
	}
}

func TestLogPath(t *testing.T) {
	path, err := LogPath()
	if err != nil {
		t.Fatal(err)
	}
	dir, err := Dir()
	if err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dir, logFileName)
	if path != want {
		t.Fatalf("got %q want %q", path, want)
	}
}
