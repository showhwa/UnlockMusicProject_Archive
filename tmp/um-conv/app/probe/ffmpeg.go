package probe

import (
	"fmt"
	"regexp"
	"strings"

	"git.um-react.app/um/um-conv/app/avconv"
	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

var reFFmpegVersion = regexp.MustCompile(`(?i)version\s+(n?\d+(?:\.\d+)*(?:[^\s]*)?)`)

func probeFFmpeg(path string) protocol.ProbeResult {
	resolved, err := resolvePath(path, "ffmpeg")
	if err != nil {
		return failResult(err)
	}

	version, err := getFFmpegVersion(resolved)
	if err != nil {
		return protocol.ProbeResult{
			OK:    false,
			Error: err.Error(),
			Path:  resolved,
		}
	}

	encoders, err := avconv.GetAudioEncoders(resolved)
	if err != nil {
		return protocol.ProbeResult{
			OK:    false,
			Error: err.Error(),
			Path:  resolved,
		}
	}

	return protocol.ProbeResult{
		OK:       true,
		Version:  version,
		Path:     resolved,
		Encoders: encoders,
	}
}

func getFFmpegVersion(ffmpeg string) (string, error) {
	result, err := cmd.CallCommand(ffmpeg, []string{"-hide_banner", "-nostdin", "-version"})
	if err != nil || result.ExitCode != 0 {
		return "", fmt.Errorf("无法获取 ffmpeg 版本 (rc=%d): %w", result.ExitCode, err)
	}
	version := parseFFmpegVersion(result.Stdout)
	if version == "" {
		return "", fmt.Errorf("无法解析 ffmpeg 版本输出")
	}
	return version, nil
}

func parseFFmpegVersion(stdout string) string {
	line, _, _ := strings.Cut(stdout, "\n")
	line = strings.TrimSpace(line)
	m := reFFmpegVersion.FindStringSubmatch(line)
	if m == nil {
		return ""
	}
	return m[1]
}
