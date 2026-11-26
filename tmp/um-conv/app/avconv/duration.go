package avconv

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
)

// Duration: 00:03:45.67
var reDuration = regexp.MustCompile(`Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)`)

// DetectDuration reads media duration in seconds via ffmpeg -i (stderr).
func (f *FFmpeg) DetectDuration(ctx context.Context, path string) (float64, error) {
	// ffmpeg -i without output exits non-zero; still parse stderr/stdout.
	out, _, err := f.probeInput(ctx, path)
	if sec, ok := parseDurationSeconds(out); ok {
		return sec, nil
	}
	if err != nil {
		return 0, fmt.Errorf("failed to detect duration for %s: %w", path, err)
	}
	return 0, fmt.Errorf("failed to detect duration for %s: duration not found", path)
}

func parseDurationSeconds(text string) (float64, bool) {
	m := reDuration.FindStringSubmatch(text)
	if m == nil {
		return 0, false
	}
	h, _ := strconv.Atoi(m[1])
	min, _ := strconv.Atoi(m[2])
	sec, err := strconv.ParseFloat(m[3], 64)
	if err != nil {
		return 0, false
	}
	total := float64(h*3600+min*60) + sec
	if total <= 0 {
		return 0, false
	}
	return total, true
}
