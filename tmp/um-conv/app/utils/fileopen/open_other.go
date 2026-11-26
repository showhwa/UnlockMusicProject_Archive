//go:build !windows && !darwin && !linux

package fileopen

import (
	"fmt"
	"os/exec"
	"runtime"
)

func openPath(absPath string) error {
	switch runtime.GOOS {
	case "freebsd", "openbsd", "netbsd":
		return startDetached(exec.Command("xdg-open", absPath))
	default:
		return unsupported()
	}
}

func revealPath(string) error {
	return unsupported()
}

func unsupported() error {
	return fmt.Errorf("unsupported platform: %s", runtime.GOOS)
}
