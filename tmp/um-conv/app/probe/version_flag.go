package probe

import (
	"fmt"
	"strings"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

// probeVersionFlag resolves path and reads version from `<bin> -V` (first line of stdout).
func probeVersionFlag(path, defaultName, label string) protocol.ProbeResult {
	resolved, err := resolvePath(path, defaultName)
	if err != nil {
		return failResult(err)
	}

	version, err := getVersionFromDashV(resolved, label)
	errorMessage := ""
	if err != nil {
		errorMessage = err.Error()
	}

	return protocol.ProbeResult{
		OK:      err == nil,
		Error:   errorMessage,
		Version: version,
		Path:    resolved,
	}
}

func getVersionFromDashV(bin, label string) (string, error) {
	result, err := cmd.CallCommand(bin, []string{"-V"})
	if err != nil || result.ExitCode != 0 {
		return "", fmt.Errorf("无法获取 %s 版本 (rc=%d): %w", label, result.ExitCode, err)
	}
	version, _, _ := strings.Cut(strings.TrimSpace(result.Stdout), "\n")
	if version == "" {
		return "", fmt.Errorf("无法解析 %s 版本输出", label)
	}
	return version, nil
}
