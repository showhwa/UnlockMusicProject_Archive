package adbkeys

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/probe"
)

var readMapsMu sync.Mutex

// LoadDeviceMaps resolves adb from adbBinarySetting (falling back to PATH), then
// reads devicePath from every online device via ReadMaps. run overrides the
// command runner when non-nil.
func LoadDeviceMaps(
	ctx context.Context,
	adbBinarySetting string,
	run func(context.Context, string, []string) (cmd.CallResult, error),
	devicePath string,
	parse func([]byte) (map[string]string, error),
) (map[string]string, error) {
	adbPath, err := probe.ResolveExecutable(adbBinarySetting, "adb")
	if err != nil {
		return nil, fmt.Errorf("找不到 adb: %w", err)
	}
	client := adb.Client{Path: adbPath, Run: run}
	return ReadMaps(ctx, client, devicePath, parse)
}

// ReadMaps reads path as root on each online device and merges the parsed maps.
// Later devices overwrite keys. A parser error or a failed read skips that device.
// The call fails when every device is skipped, when listing devices fails, or when ctx is canceled.
func ReadMaps(ctx context.Context, client adb.Client, path string, parse func([]byte) (map[string]string, error)) (map[string]string, error) {
	readMapsMu.Lock()
	defer readMapsMu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if parse == nil {
		return nil, errors.New("缺少解析函数")
	}
	devices, err := client.Devices(ctx)
	if err != nil {
		return nil, err
	}
	if len(devices) == 0 {
		return nil, errors.New("没有状态为 device 的 adb 设备")
	}

	merged := make(map[string]string)
	var soft []error
	produced := false
	for _, id := range devices {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		data, err := client.ReadFileAsRoot(ctx, id, path)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			slog.Warn("adb shell failed", "device", id, "err", err)
			soft = append(soft, fmt.Errorf("%s: %w", id, err))
			continue
		}
		keys, err := parse(data)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			slog.Warn("adb device payload rejected", "device", id, "err", err)
			soft = append(soft, fmt.Errorf("%s: %w", id, err))
			continue
		}
		produced = true
		for key, value := range keys {
			merged[key] = value
		}
	}
	if !produced {
		return nil, fmt.Errorf("从设备读取密钥失败: %w", errors.Join(soft...))
	}
	return merged, nil
}
