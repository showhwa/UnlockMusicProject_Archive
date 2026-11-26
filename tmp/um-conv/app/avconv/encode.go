package avconv

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os/exec"
	"strconv"
	"strings"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils"
)

// ConvertOptions provides optional sidecar metadata and cover inputs.
type ConvertOptions struct {
	MetadataPath string
	CoverPath    string
}

// Convert encodes src into dest according to profile.
// When onProgress is non-nil, ffmpeg -progress pipe:1 is used with detected duration.
func (f *FFmpeg) Convert(ctx context.Context, src, dest string, profile *protocol.OutputProfile, options ConvertOptions, onProgress ProgressFunc) error {
	if profile == nil {
		return fmt.Errorf("profile is nil")
	}
	if profile.Format == protocol.FormatNone {
		return fmt.Errorf("format none does not use ffmpeg convert")
	}

	inputArgs, coverMap := convertInputArgs(src, options)

	more, err := f.GetExtraConvertArgs(profile, coverMap)
	if err != nil {
		slog.Error("failed to get convert args", "format", profile.Format, "error", err)
		return err
	}

	durationSec := 0.0
	if onProgress != nil {
		if d, derr := f.DetectDuration(ctx, src); derr == nil {
			durationSec = d
		} else {
			slog.Warn("detect duration failed; progress may stay at 0", "src", src, "error", derr)
		}
	}

	args := buildConvertArgs(inputArgs, more, dest, onProgress != nil)

	cmdExec := exec.CommandContext(ctx, f.settings.FFmpeg.Path, args...)
	utils.HideConsoleWindow(cmdExec)

	var stdout io.ReadCloser
	if onProgress != nil {
		stdout, err = cmdExec.StdoutPipe()
		if err != nil {
			return fmt.Errorf("ffmpeg stdout pipe: %w", err)
		}
	}

	var stderrBuf strings.Builder
	cmdExec.Stderr = &stderrBuf

	if err := cmdExec.Start(); err != nil {
		return fmt.Errorf("start ffmpeg: %w", err)
	}

	if onProgress != nil && stdout != nil {
		readEncodeProgress(stdout, durationSec, onProgress)
	}

	waitErr := cmdExec.Wait()

	if ctx.Err() != nil {
		return ctx.Err()
	}
	if waitErr != nil {
		msg := strings.TrimSpace(stderrBuf.String())
		if msg == "" {
			msg = waitErr.Error()
		} else if len(msg) > 800 {
			msg = msg[len(msg)-800:]
		}
		slog.Error("ffmpeg convert failed", "input", src, "output", dest, "error", waitErr, "stderr", msg)
		return fmt.Errorf("ffmpeg failed: %s", msg)
	}
	if onProgress != nil {
		onProgress(100)
	}
	return nil
}

func convertInputArgs(src string, options ConvertOptions) ([]string, string) {
	args := []string{"-i", "file:" + src}
	coverMap := "0:v:0?"
	nextInput := 1
	metadataInput := -1
	if options.MetadataPath != "" {
		metadataInput = nextInput
		nextInput++
		args = append(args, "-f", "ffmetadata", "-i", "file:"+options.MetadataPath)
	}
	if options.CoverPath != "" {
		coverMap = fmt.Sprintf("%d:v:0", nextInput)
		args = append(args, "-i", "file:"+options.CoverPath)
	}
	args = append(args, "-map", "0:a")
	if metadataInput >= 0 {
		args = append(args, "-map_metadata", strconv.Itoa(metadataInput))
	}
	return args, coverMap
}

func buildConvertArgs(inputArgs, extraArgs []string, dest string, withProgress bool) []string {
	args := []string{
		"-y",
		"-hide_banner",
		"-nostdin",
		"-nostats",
		"-stats_period", "0.3",
	}
	if withProgress {
		args = append(args, "-progress", "pipe:1")
	}
	args = append(args, inputArgs...)
	args = append(args, extraArgs...)
	args = append(args, "file:"+dest)
	return args
}
