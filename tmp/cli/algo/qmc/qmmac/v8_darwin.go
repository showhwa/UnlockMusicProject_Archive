package qmmac

import (
	"fmt"
	"os"
	"path/filepath"

	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/internal/mmkv"
	"go.uber.org/zap"
)

func LoadMacKeysV8(logger *zap.Logger) (keys common.QMCKeys, err error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		logger.Warn("Failed to get home dir")
		return nil, fmt.Errorf("loadMacKeysV8: failed to get home: %w", err)
	}
	p := filepath.Join(
		homeDir,
		"Library/Containers/com.tencent.QQMusicMac/Data",
		"Library/Application Support/QQMusicMac/mmkv",
		"MMKVStreamEncryptId",
	)
	if f, err := os.Stat(p); err == nil && !f.IsDir() {
		logger.Info("Using QQMusic 8.x mmkv", zap.String("mmkv", p))
		return mmkv.LoadFromPath(p, "", logger)
	}
	return nil, nil
}
