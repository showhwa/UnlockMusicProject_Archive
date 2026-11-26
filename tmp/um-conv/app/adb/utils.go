package adb

import (
	"context"
	"strings"

	"git.um-react.app/um/um-conv/app/cmd"
)

const stderrLimit = 512

func (c Client) call(ctx context.Context, args ...string) (cmd.CallResult, error) {
	run := c.Run
	if run == nil {
		run = cmd.CallCommandContext
	}
	return run(ctx, c.Path, args)
}

func parseDevices(output string) []string {
	lines := strings.Split(output, "\n")
	if len(lines) == 0 {
		return nil
	}
	var ids []string
	for _, line := range lines[1:] {
		fields := strings.Fields(line)
		if len(fields) >= 2 && fields[1] == "device" {
			ids = append(ids, fields[0])
		}
	}
	return ids
}

func truncate(s string, max int) string {
	s = strings.TrimSpace(s)
	runes := []rune(s)
	if max <= 0 || len(runes) <= max {
		return s
	}
	return string(runes[:max]) + "…"
}

func quoteShell(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'"'"'`) + "'"
}
