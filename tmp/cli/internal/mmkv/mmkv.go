package mmkv

import (
	"fmt"
	"os"

	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/internal/utils"
	go_mmkv "github.com/unlock-music/go-mmkv"
	"go.uber.org/zap"
)

func Merge(keys ...common.QMCKeys) common.QMCKeys {
	result := make(common.QMCKeys)
	for _, k := range keys {
		for key, value := range k {
			result[utils.NormalizeUnicode(key)] = utils.NormalizeUnicode(value)
		}
	}
	return result
}

func LoadFromPath(path string, key string, logger *zap.Logger) (result common.QMCKeys, err error) {
	mmkv_path := path
	mmkv_crc := path + ".crc"

	mr, err := os.Open(mmkv_path)
	if err != nil {
		logger.Error("LoadMMKV: Could not open mmkv file", zap.Error(err))
		return nil, fmt.Errorf("LoadMMKV: open error: %w", err)
	}
	defer mr.Close()

	cr, err := os.Open(mmkv_crc)
	if err != nil {
		// crc is optional
		logger.Warn("LoadMMKV: Failed to open crc file, assuming no encryption", zap.Error(err))
		key = ""
	} else {
		defer cr.Close()
	}

	var password []byte = nil
	if key != "" {
		password = make([]byte, 16)
		copy(password, []byte(key))
	}
	mmkv, err := go_mmkv.NewMMKVReader(mr, password, cr)
	if err != nil {
		logger.Error("LoadMMKV: failed to create reader", zap.Error(err))
		return nil, fmt.Errorf("LoadMMKV: NewMMKVReader error: %w", err)
	}

	result = make(common.QMCKeys)
	for !mmkv.IsEOF() {
		key, err := mmkv.ReadKey()
		if err != nil {
			logger.Error("LoadMMKV: read key error", zap.Error(err))
			return nil, fmt.Errorf("LoadMMKV: read key error: %w", err)
		}
		value, err := mmkv.ReadStringValue()
		if err != nil {
			logger.Error("LoadMMKV: read value error", zap.Error(err))
			return nil, fmt.Errorf("LoadMMKV: read value error: %w", err)
		}
		logger.Debug("LoadMMKV: read", zap.String("key", key), zap.String("value", value))
		result[utils.NormalizeUnicode(key)] = utils.NormalizeUnicode(value)
	}

	return result, nil
}
