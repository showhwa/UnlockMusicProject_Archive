//go:build windows

package fileopen

import (
	"errors"
	"os"
	"path/filepath"
	"testing"

	"golang.org/x/sys/windows"
)

func TestWindowsPathPtrCleansPath(t *testing.T) {
	cases := map[string]string{
		`C:\Music\a b\song.mp3`:          `C:\Music\a b\song.mp3`,
		`C:\Music\a & b\song & more.mp3`: `C:\Music\a & b\song & more.mp3`,
		`C:\Music\Artist, Feat.\x,y.mp3`: `C:\Music\Artist, Feat.\x,y.mp3`,
		`C:/Music/a b/../c, d/song.mp3`:  `C:\Music\c, d\song.mp3`,
	}
	for in, want := range cases {
		p, err := windowsPathPtr(in)
		if err != nil {
			t.Fatalf("windowsPathPtr(%q) error: %v", in, err)
		}
		if got := windows.UTF16PtrToString(p); got != want {
			t.Fatalf("windowsPathPtr(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestWindowsRejectsNUL(t *testing.T) {
	bad := "C:\\Music\\a\x00b.mp3"
	if _, err := windowsPathPtr(bad); !errors.Is(err, errInvalidPath) {
		t.Fatalf("windowsPathPtr error = %v, want errInvalidPath", err)
	}
	if err := openPath(bad); !errors.Is(err, errInvalidPath) {
		t.Fatalf("openPath error = %v, want errInvalidPath", err)
	}
	if err := revealPath(bad); !errors.Is(err, errInvalidPath) {
		t.Fatalf("revealPath error = %v, want errInvalidPath", err)
	}
}

// 验证含空格、& 与逗号的真实路径可被转换为 PIDL（SHOpenFolderAndSelectItems 的输入），
// 不实际打开资源管理器窗口。
func TestCreatePIDLHandlesSpecialCharacters(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "a & b, c")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"with space.mp3", "a&b.mp3", "Artist, Feat.mp3", "x,y.mp3"} {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, nil, 0o644); err != nil {
			t.Fatal(err)
		}
		p, err := windowsPathPtr(path)
		if err != nil {
			t.Fatalf("windowsPathPtr(%q): %v", path, err)
		}
		pidl, err := createPIDL(p)
		if err != nil {
			t.Fatalf("createPIDL(%q): %v", path, err)
		}
		ilFree(pidl)
	}
}
