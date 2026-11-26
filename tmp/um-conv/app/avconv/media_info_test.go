package avconv

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

const sampleProbeOutput = `Input #0, flac, from 'song.flac':
  Duration: 00:03:40.00, start: 0.000000, bitrate: 1411 kb/s
  Stream #0:0: Audio: flac, 44100 Hz, stereo
`

const sampleNoBitrate = `Input #0, flac, from 'song.flac':
  Duration: 00:03:40.00
  Stream #0:0: Audio: flac, 44100 Hz, stereo
`

const sampleInvalidEncrypted = `Input #0, ncrypt, from 'song.ncm':
  Duration: N/A
`

func TestParseMediaInfo_Container(t *testing.T) {
	format, bitrate, ok := parseMediaInfo(sampleProbeOutput)
	if !ok || format != "FLAC" || bitrate != 1411 {
		t.Fatalf("got format=%q bitrate=%d ok=%v", format, bitrate, ok)
	}
}

func TestParseMediaInfo_MissingBitrateFails(t *testing.T) {
	if _, _, ok := parseMediaInfo(sampleNoBitrate); ok {
		t.Fatal("expected failure without bitrate")
	}
}

func TestParseMediaInfo_InvalidEncryptedOutputFails(t *testing.T) {
	if _, _, ok := parseMediaInfo(sampleInvalidEncrypted); ok {
		t.Fatal("expected failure for unrecognized demuxer output")
	}
}

func TestDemuxerExt(t *testing.T) {
	cases := map[string]string{
		"matroska": "mkv",
		"webm":     "webm",
		"asf":      "wma",
		"mp4":      "m4a",
	}
	for demuxer, want := range cases {
		if got := demuxerExt[demuxer]; got != want {
			t.Errorf("demuxerExt[%q] = %q, want %q", demuxer, got, want)
		}
	}
}

func TestParseMediaInfo_MultiDemuxerNames(t *testing.T) {
	mkvOut := "Input #0, matroska,webm, from 'a.mkv':\n  Duration: 00:01:00.00, start: 0.0, bitrate: 900 kb/s\n"
	format, bitrate, ok := parseMediaInfo(mkvOut)
	if !ok || format != "MKV" || bitrate != 900 {
		t.Fatalf("mkv got %q %d %v", format, bitrate, ok)
	}

	webmOut := "Input #0, matroska,webm, from 'file:a.WEBM':\n  Duration: 00:01:00.00, start: 0.0, bitrate: 128 kb/s\n"
	format, bitrate, ok = parseMediaInfo(webmOut)
	if !ok || format != "WEBM" || bitrate != 128 {
		t.Fatalf("webm got %q %d %v", format, bitrate, ok)
	}

	// Extensionless or non-.webm path keeps matroska -> mkv.
	if ext := resolveDemuxerExt("matroska,webm", "decrypted-temp"); ext != "mkv" {
		t.Fatalf("resolveDemuxerExt(extensionless) = %q, want mkv", ext)
	}
	if ext := resolveDemuxerExt("matroska,webm", "song.webm"); ext != "webm" {
		t.Fatalf("resolveDemuxerExt(.webm) = %q, want webm", ext)
	}
}

func TestParseMediaInfo_AsfResolvesToWMA(t *testing.T) {
	out := "Input #0, asf, from 'song.wma':\n  Duration: 00:03:12.00, start: 0.0, bitrate: 192 kb/s\n"
	format, bitrate, ok := parseMediaInfo(out)
	if !ok || format != "WMA" || bitrate != 192 {
		t.Fatalf("got format=%q bitrate=%d ok=%v, want WMA 192 true", format, bitrate, ok)
	}
}

func TestProbeMethodsPropagateContextCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	ff := NewFFmpeg(&protocol.Settings{
		FFmpeg: protocol.FFmpegSettings{Path: filepath.Join(t.TempDir(), "missing-ffmpeg.exe")},
	})

	if _, err := ff.DetectExtension(ctx, "song.flac"); !errors.Is(err, context.Canceled) {
		t.Fatalf("DetectExtension err = %v, want context.Canceled", err)
	}
	if _, err := ff.DetectDuration(ctx, "song.flac"); !errors.Is(err, context.Canceled) {
		t.Fatalf("DetectDuration err = %v, want context.Canceled", err)
	}
	if _, _, err := ff.ProbeMedia(ctx, "song.flac"); !errors.Is(err, context.Canceled) {
		t.Fatalf("ProbeMedia err = %v, want context.Canceled", err)
	}
}
