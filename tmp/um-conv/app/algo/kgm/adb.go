package kgm

import (
	"bytes"

	"git.um-react.app/um/um-conv/app/utils/adbkeys"
	"github.com/unlock-music/go-mmkv"
)

// DeviceKeyPath is the Kugou MMKV key file on a rooted device.
const DeviceKeyPath = "/data/data/com.kugou.android/files/mmkv/mggkey_multi_process"

func (a *Algo) loadAdbKeys() (map[string]string, error) {
	if err := a.ctx.Err(); err != nil {
		return nil, err
	}
	return adbkeys.LoadDeviceMaps(a.ctx, a.settings.Binaries.Adb, a.adbRun, DeviceKeyPath, ParseDeviceKeys)
}

// ParseDeviceKeys reads a Kugou MMKV payload fetched from DeviceKeyPath.
func ParseDeviceKeys(data []byte) (map[string]string, error) {
	return go_mmkv.MMKVToMap(bytes.NewReader(data), nil, nil)
}
