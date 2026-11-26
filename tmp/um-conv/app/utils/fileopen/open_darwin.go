//go:build darwin

package fileopen

import "os/exec"

func openPath(absPath string) error {
	return startDetached(exec.Command("open", absPath))
}

func revealPath(absPath string) error {
	return startDetached(exec.Command("open", "-R", absPath))
}
