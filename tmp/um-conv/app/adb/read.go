package adb

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"strings"
)

// WrapCommand encodes command so one adb shell argument runs it as root
// and returns gzip+base64 on stdout.
//
// command is base64-encoded, so quotes, $, backticks, and newlines in it are never
// interpreted by the adb shell or by the outer double quotes; the device decodes it
// with command substitution, whose result is not re-parsed by the outer shell, and
// then su -c runs it as a shell script. Callers must still quote values embedded
// in command (see quoteShell) because su -c parses command itself. command is
// placed on the left of `| gzip | base64` without grouping, so it should be a single
// simple command or pipeline, not a list using ;, && or ||.
func WrapCommand(command string) string {
	encoded := base64.StdEncoding.EncodeToString([]byte(command))
	return `su -c "$(echo "` + encoded + `" | base64 -d) | gzip | base64"`
}

// DecodeStdout reverses the device-side gzip | base64 pipeline.
func DecodeStdout(stdout string) ([]byte, error) {
	raw, err := base64.StdEncoding.DecodeString(strings.TrimSpace(stdout))
	if err != nil {
		return nil, fmt.Errorf("invalid output (base64): %w", err)
	}
	zr, err := gzip.NewReader(bytes.NewReader(raw))
	if err != nil {
		return nil, fmt.Errorf("invalid output (gzip): %w", err)
	}
	defer zr.Close()
	data, err := io.ReadAll(zr)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress adb output: %w", err)
	}
	return data, nil
}

// ReadFileAsRoot cats path as root on deviceID and returns the file bytes.
func (c Client) ReadFileAsRoot(ctx context.Context, deviceID, path string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if strings.TrimSpace(path) == "" {
		return nil, errors.New("adb path is empty")
	}
	stdout, err := c.RunCommand(ctx, deviceID, WrapCommand("cat "+quoteShell(path)))
	if err != nil {
		return nil, err
	}
	return DecodeStdout(stdout)
}
