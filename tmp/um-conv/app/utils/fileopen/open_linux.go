//go:build linux

package fileopen

import (
	"os/exec"
	"path/filepath"
)

func openPath(absPath string) error {
	return startDetached(exec.Command("xdg-open", absPath))
}

func revealPath(absPath string) error {
	fileURI := dbusFileURI(absPath)
	err := exec.Command(
		"dbus-send", "--session", "--dest=org.freedesktop.FileManager1",
		"--type=method_call", "/org/freedesktop/FileManager1",
		"org.freedesktop.FileManager1.ShowItems",
		"array:string:"+fileURI, "string:",
	).Run()
	if err == nil {
		return nil
	}
	// 降级：直接打开父目录（无法高亮具体文件）。
	return startDetached(exec.Command("xdg-open", filepath.Dir(absPath)))
}
