//go:build !windows

package utils

import "os/exec"

func HideConsoleWindow(cmd *exec.Cmd) {
	// 非 Windows 无需隐藏控制台
}
