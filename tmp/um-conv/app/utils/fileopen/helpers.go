package fileopen

import (
	"net/url"
	"os/exec"
	"path/filepath"
	"strings"
)

// fileURL 将绝对路径编码为合法的 file:// URI（空格、#、% 等字符会被转义）。
func fileURL(absPath string) string {
	return (&url.URL{Scheme: "file", Path: filepath.ToSlash(absPath)}).String()
}

// dbusFileURI 返回可安全用于 dbus-send `array:string:` 的 file:// URI。
// dbus-send 按逗号切分数组元素，因此将 `,` 编码为合法的 `%2C`。
func dbusFileURI(absPath string) string {
	return strings.ReplaceAll(fileURL(absPath), ",", "%2C")
}

// startDetached 启动子进程并在后台回收，避免产生僵尸进程。
func startDetached(cmd *exec.Cmd) error {
	if err := cmd.Start(); err != nil {
		return err
	}
	go func() { _ = cmd.Wait() }()
	return nil
}
