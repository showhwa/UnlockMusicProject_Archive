//go:build !darwin

package qmc

import (
	"git.um-react.app/um/cli/algo/common"
	"go.uber.org/zap"
)

func LoadMMKVOrDefault(path string, key string, logger *zap.Logger) (result common.QMCKeys, err error) {
	// Stub: do nothing
	return nil, nil
}
