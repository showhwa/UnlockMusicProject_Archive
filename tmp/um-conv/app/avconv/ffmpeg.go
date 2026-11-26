package avconv

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
	"sync"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

var reLine = regexp.MustCompile(`^\s*([VAS.][F.][S.][X.][B.][D.])\s+(\S+)\s+(.*)$`)

type FFmpeg struct {
	settings *protocol.Settings

	encodersOnce  sync.Once
	audioEncoders map[string]bool
}

// NewFFmpeg creates an FFmpeg helper. It does not run ffmpeg; the encoder list
// is loaded lazily on first use (see IsAudioEncoderSupported).
func NewFFmpeg(settings *protocol.Settings) *FFmpeg {
	return &FFmpeg{settings: settings}
}

// UpdateAudioEncoders loads the audio encoder list once (lazy, sync.Once).
func (f *FFmpeg) UpdateAudioEncoders() {
	f.encodersOnce.Do(func() {
		f.audioEncoders = make(map[string]bool)
		encs, err := GetAudioEncoders(f.settings.FFmpeg.Path)
		if err != nil {
			slog.Error("failed to update audio encoders", "error", err)
			return
		}

		for _, encoder := range encs {
			f.audioEncoders[encoder] = true
		}
	})
}

func (f *FFmpeg) IsAudioEncoderSupported(encoder string) bool {
	f.UpdateAudioEncoders()
	return f.audioEncoders[encoder]
}

// GetAudioEncoders lists audio encoder names reported by `ffmpeg -encoders`.
func GetAudioEncoders(ffmpeg string) (encs []string, err error) {
	result, err := cmd.CallCommand(ffmpeg, []string{"-hide_banner", "-nostdin", "-encoders"})
	if err != nil || result.ExitCode != 0 {
		return nil, fmt.Errorf("GetAudioEncoders: failed to run ffmpeg (rc=%d): %w", result.ExitCode, err)
	}
	for line := range strings.SplitSeq(result.Stdout, "\n") {
		m := reLine.FindStringSubmatch(line)
		if m != nil && m[1][0] == 'A' {
			encs = append(encs, m[2])
		}
	}
	return encs, nil
}

// probeInput runs `ffmpeg -i file:<path>` (no output) and returns the textual
// output (stderr, falling back to stdout) along with the raw result. ffmpeg
// exits non-zero in this mode, so callers decide how to treat err / exit code.
func (f *FFmpeg) probeInput(ctx context.Context, path string) (out string, result cmd.CallResult, err error) {
	result, err = cmd.CallCommandContext(ctx, f.settings.FFmpeg.Path, []string{"-hide_banner", "-nostdin", "-i", "file:" + path})
	if ctxErr := ctx.Err(); ctxErr != nil {
		return "", result, ctxErr
	}
	out = result.Stderr
	if out == "" {
		out = result.Stdout
	}
	return out, result, err
}
