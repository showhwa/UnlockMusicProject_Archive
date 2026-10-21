//go:build !darwin && !windows

package qmc

import (
	"git.um-react.app/um/cli/algo/common"
	"go.uber.org/zap"
)

func LoadMMKVOrDefault(opts MMKVLoaderOptions, logger *zap.Logger) (result common.QMCKeys, err error) {
	// No platform-default QMC keys on this OS.
	return nil, nil
}
