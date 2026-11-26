package adb

import (
	"context"
	"fmt"
)

// Devices returns ids whose adb devices status is "device", in output order.
func (c Client) Devices(ctx context.Context) ([]string, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	result, err := c.call(ctx, "devices")
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}
	if err != nil || result.ExitCode != 0 {
		return nil, fmt.Errorf("adb devices 失败 (exit=%d): %s", result.ExitCode, truncate(result.Stderr, stderrLimit))
	}
	return parseDevices(result.Stdout), nil
}
