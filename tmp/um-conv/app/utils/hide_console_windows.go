//go:build windows

package utils

import (
	"os/exec"
	"syscall"

	"golang.org/x/sys/windows"
)

// HideConsoleWindow 隐藏控制台，并把子进程降到 IDLE_PRIORITY_CLASS，避免卡顿系统。
func HideConsoleWindow(cmd *exec.Cmd) {
	if cmd.SysProcAttr == nil {
		cmd.SysProcAttr = &syscall.SysProcAttr{}
	}
	cmd.SysProcAttr.HideWindow = true
	cmd.SysProcAttr.CreationFlags |= windows.IDLE_PRIORITY_CLASS
}
