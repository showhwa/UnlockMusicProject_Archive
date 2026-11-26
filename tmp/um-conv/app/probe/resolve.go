package probe

import (
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func stripSuffixIgnoreCase(s, suffix string) string {
	n := len(s)
	m := len(suffix)
	if m > 0 && m < n && strings.EqualFold(s[n-m:], suffix) {
		return s[:n-m]
	}
	return s
}

func binExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return !info.IsDir()
}

// resolveBinPath finds given name in bin and $PATH.
func resolveBinPath(name string) (string, error) {
	suffix := ""
	if runtime.GOOS == "windows" {
		suffix = ".exe"
	}
	// Check for "<exe_dir>/bin/<defaultName>[.exe]" and "$PATH/<defaultName>[.exe]"
	exe, err := os.Executable()
	if err != nil {
		return "", fmt.Errorf("获取可执行文件路径失败: %w", err)
	}
	binDir := filepath.Join(filepath.Dir(exe), "bin")
	name = stripSuffixIgnoreCase(strings.TrimSpace(name), suffix) + suffix
	binPath := filepath.Join(binDir, name)
	slog.Debug("resolveBinPath:binExists", "binPath", binPath)
	if binExists(binPath) {
		return binPath, nil
	}
	resolved, err := exec.LookPath(name)
	if err == nil {
		return resolved, nil
	}
	slog.Error("resolveBinPath:lookPath", "name", name, "err", err)
	return "", fmt.Errorf("bin 目录和 $PATH 中未找到可执行文件 %s", name)
}

// ResolveExecutable resolves a configured binary path (empty/name → bin dir + PATH; absolute → must exist).
func ResolveExecutable(path, defaultName string) (string, error) {
	return resolvePath(path, defaultName)
}

func resolvePath(path, defaultName string) (string, error) {
	path = strings.TrimSpace(path)
	if !strings.ContainsAny(path, "/\\") && filepath.VolumeName(path) == "" {
		name := path
		if name == "" {
			name = defaultName
		}
		return resolveBinPath(name)
	}

	// it needs to be abs path
	if !filepath.IsAbs(path) {
		return "", fmt.Errorf("路径不是绝对路径")
	}
	// Now we check if the file exists
	if binExists(path) {
		return path, nil
	}
	return "", fmt.Errorf("路径不存在或无权限")
}
