package avconv

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
)

var reBitrateKbps = regexp.MustCompile(`(?m)bitrate:\s*(\d+)\s*kb/s`)

// ProbeMedia runs ffmpeg -i and parses container format and bitrate from stderr.
func (f *FFmpeg) ProbeMedia(ctx context.Context, path string) (format string, bitrateKbps int, err error) {
	out, _, callErr := f.probeInput(ctx, path)
	if ctxErr := ctx.Err(); ctxErr != nil {
		return "", 0, ctxErr
	}
	format, bitrateKbps, ok := parseMediaInfoForPath(out, path)
	if !ok {
		if callErr != nil {
			return "", 0, fmt.Errorf("failed to probe media for %s: %w", path, callErr)
		}
		return "", 0, fmt.Errorf("failed to probe media for %s: invalid ffmpeg output", path)
	}
	return format, bitrateKbps, nil
}

func parseMediaInfo(ffmpegOutput string) (format string, bitrateKbps int, ok bool) {
	return parseMediaInfoForPath(ffmpegOutput, "")
}

func parseMediaInfoForPath(ffmpegOutput, inputPath string) (format string, bitrateKbps int, ok bool) {
	m := reFfmpegInput.FindStringSubmatch(ffmpegOutput)
	if m == nil {
		return "", 0, false
	}
	if inputPath == "" {
		if sm := reFfmpegInputWithSource.FindStringSubmatch(ffmpegOutput); sm != nil {
			inputPath = sm[2]
		}
	}
	if ext := resolveDemuxerExt(m[1], inputPath); ext != "" {
		format = strings.ToUpper(ext)
	}
	if format == "" {
		return "", 0, false
	}
	bm := reBitrateKbps.FindStringSubmatch(ffmpegOutput)
	if bm == nil {
		return "", 0, false
	}
	bitrate, err := strconv.Atoi(bm[1])
	if err != nil || bitrate <= 0 {
		return "", 0, false
	}
	return format, bitrate, true
}
