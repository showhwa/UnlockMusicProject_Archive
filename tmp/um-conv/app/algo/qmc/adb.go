package qmc

import (
	"context"
	"fmt"
	"log/slog"
	"os"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils/adbkeys"
)

// DeviceDBPath is the QQ Music player database on a rooted device.
const DeviceDBPath = "/data/data/com.tencent.qqmusic/databases/player_process_db"

// loadAdbKeys fetches and caches device keys once per batch using the constructor
// settings (a.settings) so all calls in the batch share a consistent cache.
func (a *QMPCAlgo) loadAdbKeys() (map[string]string, error) {
	if err := a.ctx.Err(); err != nil {
		return nil, err
	}
	if a.settings == nil {
		return nil, errMissingSettings
	}
	return adbkeys.LoadDeviceMaps(a.ctx, a.settings.Binaries.Adb, a.adbRun, DeviceDBPath, a.qmcKeysFromDevice)
}

func (a *QMPCAlgo) qmcKeysFromDevice(data []byte) (map[string]string, error) {
	return ParseDeviceDatabase(a.ctx, protocol.ResolveTempDir(a.settings), data)
}

// ParseDeviceDatabase reads ekeys from a player_process_db payload fetched from DeviceDBPath.
// An empty tempDir uses the system temp directory.
func ParseDeviceDatabase(ctx context.Context, tempDir string, data []byte) (map[string]string, error) {
	file, err := os.CreateTemp(tempDir, "um-conv-qmc-adb-*.db")
	if err != nil {
		return nil, fmt.Errorf("无法创建 QQ 音乐临时数据库: %w", err)
	}
	path := file.Name()
	defer func() {
		if removeErr := os.Remove(path); removeErr != nil && !os.IsNotExist(removeErr) {
			slog.Warn("cleanup qmc adb database", "path", path, "err", removeErr)
		}
	}()
	if _, err := file.Write(data); err != nil {
		_ = file.Close()
		return nil, fmt.Errorf("无法写入 QQ 音乐临时数据库: %w", err)
	}
	if err := file.Close(); err != nil {
		return nil, fmt.Errorf("无法关闭 QQ 音乐临时数据库: %w", err)
	}
	return ReadQQMusicDatabase(ctx, path)
}
