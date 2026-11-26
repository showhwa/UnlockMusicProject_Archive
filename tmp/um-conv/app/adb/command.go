package adb

import (
	"context"
	"fmt"
	"regexp"
)

var deviceIDPattern = regexp.MustCompile(`^[A-Za-z0-9._:-]+$`)

// RunCommand runs command on deviceID through adb shell and returns raw stdout.
// The command is not wrapped or decoded. An empty deviceID omits -s.
func (c Client) RunCommand(ctx context.Context, deviceID, command string) (string, error) {
	if err := ctx.Err(); err != nil {
		return "", err
	}
	if deviceID != "" && !deviceIDPattern.MatchString(deviceID) {
		return "", fmt.Errorf("无效的 adb 设备 id: %q", deviceID)
	}
	args := []string{"shell", command}
	if deviceID != "" {
		args = []string{"-s", deviceID, "shell", command}
	}
	result, err := c.call(ctx, args...)
	if ctx.Err() != nil {
		return "", ctx.Err()
	}
	if err != nil || result.ExitCode != 0 {
		return "", fmt.Errorf("adb shell 失败 (exit=%d): %s", result.ExitCode, truncate(result.Stderr, stderrLimit))
	}
	return result.Stdout, nil
}
