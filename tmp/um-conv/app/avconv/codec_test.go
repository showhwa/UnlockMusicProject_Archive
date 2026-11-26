package avconv

import (
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

const testCoverMap = "0:v:0?"

// newTestFFmpeg builds an FFmpeg with a preloaded encoder set so no ffmpeg process runs.
func newTestFFmpeg(settings protocol.Settings, encoders ...string) *FFmpeg {
	f := NewFFmpeg(&settings)
	f.encodersOnce.Do(func() {
		f.audioEncoders = make(map[string]bool, len(encoders))
		for _, e := range encoders {
			f.audioEncoders[e] = true
		}
	})
	return f
}

func TestGetExtraConvertArgs(t *testing.T) {
	mp3Cover := []string{
		"-id3v2_version", "3", "-ar", "44100",
		"-map", testCoverMap,
		"-vf", "scale=w='min(500,iw)':h='min(500,ih)':force_original_aspect_ratio=decrease",
		"-c:v", "mjpeg", "-q:v", "2", "-pix_fmt", "yuvj420p",
		"-disposition:v", "attached_pic",
	}
	copyCover := []string{"-map", testCoverMap, "-c:v", "copy", "-disposition:v", "attached_pic"}

	cat := func(parts ...[]string) []string {
		var out []string
		for _, p := range parts {
			out = append(out, p...)
		}
		return out
	}

	cases := []struct {
		name     string
		settings protocol.Settings
		format   protocol.Format
		encoders []string
		want     []string
	}{
		{
			name:     "mp3 high",
			settings: protocol.Settings{AudioQuality: protocol.AudioQualityHigh},
			format:   protocol.FormatMP3,
			encoders: []string{"libmp3lame"},
			want:     cat([]string{"-c:a", "libmp3lame"}, mp3Cover, []string{"-b:a", "320k"}),
		},
		{
			name:     "mp3 medium",
			settings: protocol.Settings{AudioQuality: protocol.AudioQualityMedium},
			format:   protocol.FormatMP3,
			encoders: []string{"libmp3lame"},
			want:     cat([]string{"-c:a", "libmp3lame"}, mp3Cover, []string{"-b:a", "192k"}),
		},
		{
			name:     "mp3 low",
			settings: protocol.Settings{AudioQuality: protocol.AudioQualityLow},
			format:   protocol.FormatMP3,
			encoders: []string{"libmp3lame"},
			want:     cat([]string{"-c:a", "libmp3lame"}, mp3Cover, []string{"-b:a", "128k"}),
		},
		{
			name: "m4a libfdk_aac vbr high",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderFDK, AACFdkWithVBR: true},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"libfdk_aac"},
			want:     cat([]string{"-c:a", "libfdk_aac", "-movflags", "+faststart"}, copyCover, []string{"-vbr", "5"}),
		},
		{
			name: "m4a libfdk_aac vbr low",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityLow,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderFDK, AACFdkWithVBR: true},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"libfdk_aac"},
			want:     cat([]string{"-c:a", "libfdk_aac", "-movflags", "+faststart"}, copyCover, []string{"-vbr", "3"}),
		},
		{
			name: "m4a libfdk_aac cbr medium",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityMedium,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderFDK},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"libfdk_aac"},
			want:     cat([]string{"-c:a", "libfdk_aac", "-movflags", "+faststart"}, copyCover, []string{"-b:a", "192k"}),
		},
		{
			name: "m4a aac ignores vbr flag",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderAAC, AACFdkWithVBR: true},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"aac"},
			want:     cat([]string{"-c:a", "aac", "-movflags", "+faststart"}, copyCover, []string{"-b:a", "256k"}),
		},
		{
			name: "m4a auto prefers libfdk_aac",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityLow,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderAuto},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"aac", "libfdk_aac"},
			want:     cat([]string{"-c:a", "libfdk_aac", "-movflags", "+faststart"}, copyCover, []string{"-b:a", "128k"}),
		},
		{
			name: "m4a auto falls back to aac",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{AACEncoder: protocol.AACEncoderAuto},
			},
			format:   protocol.FormatM4A,
			encoders: []string{"aac"},
			want:     cat([]string{"-c:a", "aac", "-movflags", "+faststart"}, copyCover, []string{"-b:a", "256k"}),
		},
		{
			name: "ogg libopus high",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderOpus},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libopus"},
			want:     []string{"-c:a", "libopus", "-vbr", "on", "-b:a", "192k"},
		},
		{
			name: "ogg libopus medium",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityMedium,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderOpus},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libopus"},
			want:     []string{"-c:a", "libopus", "-vbr", "on", "-b:a", "128k"},
		},
		{
			name: "ogg libopus low",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityLow,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderOpus},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libopus"},
			want:     []string{"-c:a", "libopus", "-vbr", "on", "-b:a", "96k"},
		},
		{
			name: "ogg libvorbis high",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderVorbis},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libvorbis"},
			want:     []string{"-c:a", "libvorbis", "-q:a", "8"},
		},
		{
			name: "ogg libvorbis low",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityLow,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderVorbis},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libvorbis"},
			want:     []string{"-c:a", "libvorbis", "-q:a", "4"},
		},
		{
			name: "ogg auto prefers libopus",
			settings: protocol.Settings{
				AudioQuality: protocol.AudioQualityHigh,
				FFmpeg:       protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderAuto},
			},
			format:   protocol.FormatOGG,
			encoders: []string{"libvorbis", "libopus"},
			want:     []string{"-c:a", "libopus", "-vbr", "on", "-b:a", "192k"},
		},
		{
			name:     "flac",
			settings: protocol.Settings{},
			format:   protocol.FormatFLAC,
			encoders: []string{"flac"},
			want:     cat([]string{"-c:a", "flac", "-compression_level", "8"}, copyCover),
		},
		{
			name:     "wav",
			settings: protocol.Settings{},
			format:   protocol.FormatWAV,
			encoders: []string{"pcm_s16le"},
			want:     []string{"-c:a", "pcm_s16le", "-rf64", "auto"},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			f := newTestFFmpeg(tc.settings, tc.encoders...)
			got, err := f.GetExtraConvertArgs(&protocol.OutputProfile{Format: tc.format}, testCoverMap)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("args =\n%#v\nwant\n%#v", got, tc.want)
			}
		})
	}
}

func TestGetExtraConvertArgsErrors(t *testing.T) {
	t.Run("unsupported format", func(t *testing.T) {
		f := newTestFFmpeg(protocol.Settings{})
		codec, err := f.GetProfileEncoderCodec(&protocol.OutputProfile{Format: "bogus"})
		if err == nil || codec != "" || !strings.Contains(err.Error(), "unsupported format") {
			t.Fatalf("codec=%q err=%v", codec, err)
		}
		if args, err := f.GetExtraConvertArgs(&protocol.OutputProfile{Format: "bogus"}, testCoverMap); err == nil || args != nil {
			t.Fatalf("args=%v err=%v", args, err)
		}
	})
	t.Run("encoder missing from ffmpeg", func(t *testing.T) {
		f := newTestFFmpeg(protocol.Settings{}) // no encoders available
		_, err := f.GetProfileEncoderCodec(&protocol.OutputProfile{Format: protocol.FormatMP3})
		if err == nil || !strings.Contains(err.Error(), "unsupported encoder: libmp3lame") {
			t.Fatalf("err=%v", err)
		}
	})
	t.Run("auto with no candidates", func(t *testing.T) {
		f := newTestFFmpeg(protocol.Settings{FFmpeg: protocol.FFmpegSettings{OGGEncoder: protocol.OGGEncoderAuto}})
		if _, err := f.GetProfileEncoderCodec(&protocol.OutputProfile{Format: protocol.FormatOGG}); err == nil {
			t.Fatal("expected error")
		}
	})
}

func TestNewFFmpegIsLazy(t *testing.T) {
	settings := protocol.Settings{}
	settings.FFmpeg.Path = "definitely-not-a-real-ffmpeg-binary"
	f := NewFFmpeg(&settings)
	if f.audioEncoders != nil {
		t.Fatal("NewFFmpeg must not load encoders")
	}
	// Probing input must not trigger the encoder list.
	_, _, _ = f.probeInput(t.Context(), "x.flac")
	if f.audioEncoders != nil {
		t.Fatal("probeInput must not load encoders")
	}
	if f.IsAudioEncoderSupported("flac") {
		t.Fatal("encoder should not be supported when ffmpeg is unavailable")
	}
	if f.audioEncoders == nil {
		t.Fatal("IsAudioEncoderSupported should lazily load encoders")
	}
}
