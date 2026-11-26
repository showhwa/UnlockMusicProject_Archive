package avconv

import (
	"context"
	"fmt"
	"log/slog"
	"path/filepath"
	"regexp"
	"strings"
)

// Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'xxx':
var reFfmpegInput = regexp.MustCompile(`(?m)^Input #0, (\S+), from `)
var reFfmpegInputWithSource = regexp.MustCompile(`(?m)^Input #0, (\S+), from '([^'\r\n]+)':`)

// ffmpeg demuxer name -> file extension.
var demuxerExt = map[string]string{
	"flac":     "flac",
	"wav":      "wav",
	"ogg":      "ogg",
	"mp4":      "m4a",
	"aac":      "aac",
	"mp3":      "mp3",
	"matroska": "mkv",
	"webm":     "webm",
	"asf":      "wma",
}

// resolveDemuxerExt maps ffmpeg's comma-separated demuxer list to an output
// extension. FFmpeg reports both .mkv and .webm under "matroska,webm", so a
// .webm input path selects "webm" instead of defaulting to "mkv".
func resolveDemuxerExt(demuxers, inputPath string) string {
	var first string
	hasWebm := false
	for demuxer := range strings.SplitSeq(demuxers, ",") {
		if demuxer == "webm" {
			hasWebm = true
		}
		if first == "" {
			if ext, ok := demuxerExt[demuxer]; ok {
				first = ext
			}
		}
	}
	if hasWebm && strings.EqualFold(filepath.Ext(inputPath), ".webm") {
		return "webm"
	}
	return first
}

func (f *FFmpeg) DetectExtension(ctx context.Context, path string) (string, error) {
	// ffmpeg should exit with rc=1, since we don't specify an output file
	out, c, err := f.probeInput(ctx, path)
	if ctxErr := ctx.Err(); ctxErr != nil {
		return "", ctxErr
	}
	if c.ExitCode != 1 {
		slog.Error("failed to detect extension (ffmpeg failed)", "path", path, "error", err, "rc", c.ExitCode)
		if err != nil {
			return "", fmt.Errorf("failed to detect extension for %s (rc=%d): %w", path, c.ExitCode, err)
		}
		return "", fmt.Errorf("failed to detect extension for %s (rc=%d)", path, c.ExitCode)
	}

	if m := reFfmpegInput.FindStringSubmatch(out); m != nil {
		if ext := resolveDemuxerExt(m[1], path); ext != "" {
			return ext, nil
		}

		slog.Error("could not detect extension (demuxer not found)", "path", path, "demuxer", m[1])
		return "", fmt.Errorf("failed to detect extension for %s: unknown format (%s)", path, m[1])
	}

	slog.Error("could not detect extension (ffmpeg output invalid)", "path", path, "output", out)
	return "", fmt.Errorf("failed to detect extension for %s: ffmpeg output invalid", path)
}
