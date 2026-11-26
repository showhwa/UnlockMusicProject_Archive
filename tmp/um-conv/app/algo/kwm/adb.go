package kwm

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"strings"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/probe"
	"git.um-react.app/um/um-conv/app/utils/adbkeys"
	"github.com/unlock-music/go-mmkv"
)

// DeviceKeyPath is the Kuwo MMKV key file on a rooted device.
const DeviceKeyPath = "/data/data/cn.kuwo.player/files/mmkv/cn.kuwo.player.mmkv.defaultconfig"

const deviceKeyPrefix = "sec_ekey#"

func deviceKey(resourceID uint32, formatName string) string {
	return fmt.Sprintf("%d-%s", resourceID, formatName)
}

func (a *Algo) loadAdbKeys() (map[string]string, error) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	adbSetting := ""
	if a.settings != nil {
		adbSetting = a.settings.Binaries.Adb
	}
	adbPath, err := probe.ResolveExecutable(adbSetting, "adb")
	if err != nil {
		return nil, fmt.Errorf("找不到 adb: %w", err)
	}
	client := adb.Client{Path: adbPath, Run: a.adbRun}
	return adbkeys.ReadMaps(ctx, client, DeviceKeyPath, ParseDeviceKeys)
}

// ParseDeviceKeys reads Kuwo sec_ekey entries from an MMKV payload fetched from DeviceKeyPath.
// Returned keys have the "sec_ekey#" prefix stripped.
func ParseDeviceKeys(data []byte) (map[string]string, error) {
	reader, err := go_mmkv.NewMMKVReader(bytes.NewReader(data), -1, nil, nil)
	if err != nil {
		return nil, err
	}

	keys := make(map[string]string)
	for !reader.IsEOF() {
		key, err := reader.ReadKey()
		if err != nil {
			return nil, err
		}
		id, ok := strings.CutPrefix(key, deviceKeyPrefix)
		if !ok {
			if err := skipMMKVContainer(reader); err != nil {
				return nil, err
			}
			continue
		}
		value, err := reader.ReadStringValue()
		if err != nil {
			return nil, err
		}
		if id == "" {
			continue
		}
		if value == "" {
			delete(keys, id)
		} else {
			keys[id] = value
		}
	}
	return keys, nil
}

func skipMMKVContainer(reader *go_mmkv.MMKVReader) error {
	n, err := reader.ReadInt()
	if err != nil {
		return err
	}
	avail := reader.BytesAvailable()
	if avail < 0 || n > uint64(avail) {
		return io.EOF
	}
	if n > 0 {
		if _, err := reader.ReadBytes(int64(n)); err != nil {
			return err
		}
	}
	return nil
}
