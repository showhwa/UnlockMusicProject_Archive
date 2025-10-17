package qmc

import (
	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/algo/qmc/qmmac"
	"git.um-react.app/um/cli/internal/mmkv"
	"go.uber.org/zap"
)

func LoadMMKVOrDefault(path string, key string, logger *zap.Logger) (result common.QMCKeys, err error) {
	key1, err := qmmac.LoadMacKeysV8(logger)
	if err != nil {
		key1 = nil
		logger.Warn("LoadMMKVOrDefault: could not read QQMusic v8.8.0 keys", zap.Error(err))
	}

	key2, err := qmmac.LoadMacKeysV10(logger)
	if err != nil {
		key2 = nil
		logger.Warn("LoadMMKVOrDefault: could not read QQMusic v10.x keys", zap.Error(err))
	}

	userKeys := make(common.QMCKeys)
	if path != "" {
		logger.Info("Using user mmkv")
		userKeys, err = mmkv.LoadFromPath(path, key, logger)
		if err != nil {
			userKeys = nil
			logger.Warn("LoadMMKVOrDefault: could not read user keys", zap.Error(err))
		}
	}

	allKeys := mmkv.Merge(key1, key2, userKeys)

	logger.Debug("Keys loaded", zap.Any("keys", allKeys), zap.Int("len", len(allKeys)))

	return allKeys, nil
}
