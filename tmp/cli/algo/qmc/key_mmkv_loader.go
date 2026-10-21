package qmc

import (
	"bufio"
	"io"
	"strings"

	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/internal/mmkv"
	"git.um-react.app/um/cli/internal/utils"
	"go.uber.org/zap"
)

// MMKVLoaderOptions holds platform-specific inputs for LoadMMKVOrDefault.
type MMKVLoaderOptions struct {
	CliExe string // qmpc-mmkv-cli path (--qmpc-mmkv-cli-exe); Windows only
}

// LoadUserMMKV loads keys from a user-specified mmkv path. Soft-fails with a warning.
func LoadUserMMKV(path string, key string, logger *zap.Logger) common.QMCKeys {
	if path == "" {
		return nil
	}
	logger.Debug("LoadUserMMKV: Loading user mmkv", zap.String("path", path), zap.String("key", key))
	userKeys, err := mmkv.LoadFromPath(path, key, logger)
	if err != nil {
		logger.Warn("LoadUserMMKV: could not read user keys", zap.Error(err))
		return nil
	}
	logger.Info("Using user mmkv", zap.String("path", path), zap.Int("count", len(userKeys)))
	return userKeys
}

// parseQmpcMMKVCliOutput reads qmpc-mmkv-cli plaintext output as alternating
// filename / ekey lines and builds a QMCKeys map.
func parseQmpcMMKVCliOutput(r io.Reader, logger *zap.Logger) common.QMCKeys {
	sc := bufio.NewScanner(r)
	result := make(common.QMCKeys)

	var name string
	nameRead := false
	for sc.Scan() {
		line := utils.NormalizeUnicode(strings.TrimSpace(sc.Text()))
		if !nameRead {
			name = line
		} else {
			if name != "" && line != "" {
				result[name] = line
			}
		}
		nameRead = !nameRead
	}

	if err := sc.Err(); err != nil {
		logger.Warn("parseQmpcMMKVCliOutput: error reading qmpc-mmkv-cli output", zap.Error(err))
	}
	if nameRead {
		logger.Warn("parseQmpcMMKVCliOutput: qmpc-mmkv-cli output has odd number of lines, ignoring last line",
			zap.String("line", name),
		)
	}

	return result
}
