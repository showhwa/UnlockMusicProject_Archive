package qmc

import (
	"bytes"
	"os/exec"

	"git.um-react.app/um/cli/algo/common"
	"go.uber.org/zap"
)

func runQmpcMMKVCLi(exe string) (stdout, stderr bytes.Buffer, err error) {
	cmd := exec.Command(exe, "-f", "plaintext", "-o", "-")
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err = cmd.Run()
	return stdout, stderr, err
}

func LoadMMKVOrDefault(opts MMKVLoaderOptions, logger *zap.Logger) (result common.QMCKeys, err error) {
	exe := opts.CliExe

	stdout, stderr, err := runQmpcMMKVCLi(exe)
	if err != nil {
		logger.Warn("LoadMMKVOrDefault: qmpc-mmkv-cli exited with error",
			zap.String("exe", exe),
			zap.Error(err),
			zap.String("stderr", stderr.String()),
		)
		return nil, nil
	}

	result = parseQmpcMMKVCliOutput(&stdout, logger)
	logger.Debug("LoadMMKVOrDefault: Keys loaded from qmpc-mmkv-cli", zap.Int("count", len(result)))
	return result, nil
}
