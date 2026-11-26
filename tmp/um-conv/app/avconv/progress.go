package avconv

import (
	"bufio"
	"io"
	"strconv"
	"strings"
)

// ProgressFunc reports encode percent in [0, 100].
type ProgressFunc func(percent float64)

func readEncodeProgress(r io.Reader, durationSec float64, onProgress ProgressFunc) {
	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var outTimeUs int64
	for scanner.Scan() {
		line := scanner.Text()
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		switch key {
		case "out_time_us", "out_time_ms":
			if isProgressNA(val) {
				continue
			}
			if n, err := strconv.ParseInt(val, 10, 64); err == nil {
				outTimeUs = n
			}
		case "progress":
			percent := 0.0
			if durationSec > 0 {
				percent = float64(outTimeUs) / 1e6 / durationSec * 100
				if percent > 100 {
					percent = 100
				}
				if percent < 0 {
					percent = 0
				}
			}
			if val == "end" {
				onProgress(100)
			} else {
				onProgress(percent)
			}
		}
	}
}

// isProgressNA reports whether a progress value is the "N/A" placeholder.
func isProgressNA(val string) bool {
	return strings.EqualFold(strings.TrimSpace(val), "N/A")
}
