package probe

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestStripSuffixIgnoreCase(t *testing.T) {
	cases := []struct {
		s, suffix, want string
	}{
		{"ffmpeg.exe", ".exe", "ffmpeg"},
		{"ffmpeg.EXE", ".exe", "ffmpeg"},
		{"ffmpeg.Exe", ".exe", "ffmpeg"},
		{"ffmpeg", ".exe", "ffmpeg"},
		{".exe", ".exe", ".exe"}, // suffix equals whole string: keep
		{"ffmpeg.exe", "", "ffmpeg.exe"},
	}
	for _, tc := range cases {
		if got := stripSuffixIgnoreCase(tc.s, tc.suffix); got != tc.want {
			t.Errorf("stripSuffixIgnoreCase(%q, %q) = %q, want %q", tc.s, tc.suffix, got, tc.want)
		}
	}
}

func TestResolvePathAbsoluteExisting(t *testing.T) {
	dir := t.TempDir()
	file := filepath.Join(dir, "tool.EXE")
	if err := os.WriteFile(file, []byte("x"), 0o755); err != nil {
		t.Fatal(err)
	}

	paths := []string{file, filepath.ToSlash(file)}
	if runtime.GOOS == "windows" {
		paths = append(paths, strings.ReplaceAll(file, "/", `\`))
	}
	for _, p := range paths {
		got, err := resolvePath(p, "ffmpeg")
		if err != nil {
			t.Errorf("resolvePath(%q) error: %v", p, err)
			continue
		}
		if got != p {
			t.Errorf("resolvePath(%q) = %q", p, got)
		}
	}
}

func TestResolvePathAbsoluteMissing(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "nope", "ffmpeg")
	for _, p := range []string{missing, filepath.ToSlash(missing)} {
		if _, err := resolvePath(p, "ffmpeg"); err == nil {
			t.Errorf("resolvePath(%q) expected error for missing file", p)
		}
	}
}

func TestResolvePathAbsoluteDirectoryRejected(t *testing.T) {
	if _, err := resolvePath(t.TempDir(), "ffmpeg"); err == nil {
		t.Fatal("expected error for directory")
	}
}

func TestResolvePathRelativeRejected(t *testing.T) {
	for _, p := range []string{"bin/ffmpeg", `bin\ffmpeg`, "./ffmpeg", `.\ffmpeg`, "../ffmpeg", "sub/dir/ffmpeg.exe"} {
		_, err := resolvePath(p, "ffmpeg")
		if err == nil {
			t.Errorf("resolvePath(%q) expected relative-path error", p)
			continue
		}
		if !strings.Contains(err.Error(), "绝对路径") {
			t.Errorf("resolvePath(%q) error = %v, want not-absolute error", p, err)
		}
	}
}

func TestResolvePathWindowsStylePaths(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("Windows-specific path semantics")
	}
	// Volume-relative path must not be treated as a bare filename.
	if _, err := resolvePath(`C:ffmpeg.exe`, "ffmpeg"); err == nil || !strings.Contains(err.Error(), "绝对路径") {
		t.Errorf("volume-relative path: err = %v, want not-absolute error", err)
	}
	// Absolute path with forward slashes that does not exist: reaches existence check, not bare-name lookup.
	_, err := resolvePath(`C:/definitely/missing/ffmpeg.exe`, "ffmpeg")
	if err == nil || !strings.Contains(err.Error(), "不存在") {
		t.Errorf("forward-slash abs path: err = %v, want not-exist error", err)
	}
	_, err = resolvePath(`C:\definitely\missing\ffmpeg.exe`, "ffmpeg")
	if err == nil || !strings.Contains(err.Error(), "不存在") {
		t.Errorf("backslash abs path: err = %v, want not-exist error", err)
	}
}
