package probe

import (
	"fmt"
	"strings"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

func probeAdb(path string) protocol.ProbeResult {
	resolved, err := resolvePath(path, "adb")
	if err != nil {
		return failResult(err)
	}

	result, err := cmd.CallCommand(resolved, []string{"version"})
	if err != nil || result.ExitCode != 0 {
		message := fmt.Sprintf("无法获取 adb 版本 (rc=%d)", result.ExitCode)
		if err != nil {
			message += ": " + err.Error()
		}
		if detail := strings.TrimSpace(result.Stderr); detail != "" {
			message += ": " + detail
		}
		return protocol.ProbeResult{
			OK:    false,
			Error: message,
			Path:  resolved,
		}
	}

	line, _, _ := strings.Cut(result.Stdout, "\n")
	line = strings.TrimSpace(line)
	if line == "" {
		return protocol.ProbeResult{
			OK:    false,
			Error: "无法解析 adb 版本输出",
			Path:  resolved,
		}
	}
	return protocol.ProbeResult{
		OK:      true,
		Version: line,
		Path:    resolved,
	}
}
