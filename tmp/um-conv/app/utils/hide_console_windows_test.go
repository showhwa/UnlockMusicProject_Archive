//go:build windows

package utils

import (
	"os/exec"
	"syscall"
	"testing"

	"golang.org/x/sys/windows"
)

func TestHideConsoleWindow_SetsHideAndIdlePriority(t *testing.T) {
	cmd := exec.Command("cmd", "/c", "exit")
	HideConsoleWindow(cmd)
	if cmd.SysProcAttr == nil {
		t.Fatal("SysProcAttr is nil")
	}
	if !cmd.SysProcAttr.HideWindow {
		t.Fatal("HideWindow should be true")
	}
	if cmd.SysProcAttr.CreationFlags&windows.IDLE_PRIORITY_CLASS == 0 {
		t.Fatal("expected IDLE_PRIORITY_CLASS in CreationFlags")
	}
}

func TestHideConsoleWindow_PreservesExistingSysProcAttr(t *testing.T) {
	cmd := exec.Command("cmd", "/c", "exit")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		CreationFlags: windows.CREATE_NEW_PROCESS_GROUP,
		CmdLine:       "existing",
	}
	HideConsoleWindow(cmd)
	if !cmd.SysProcAttr.HideWindow {
		t.Fatal("HideWindow should be true")
	}
	if cmd.SysProcAttr.CreationFlags&windows.IDLE_PRIORITY_CLASS == 0 {
		t.Fatal("expected IDLE_PRIORITY_CLASS in CreationFlags")
	}
	if cmd.SysProcAttr.CreationFlags&windows.CREATE_NEW_PROCESS_GROUP == 0 {
		t.Fatal("expected pre-existing CREATE_NEW_PROCESS_GROUP to be preserved")
	}
	if cmd.SysProcAttr.CmdLine != "existing" {
		t.Fatalf("CmdLine = %q, want %q", cmd.SysProcAttr.CmdLine, "existing")
	}
}
