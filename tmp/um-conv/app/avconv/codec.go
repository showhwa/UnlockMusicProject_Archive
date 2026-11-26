package avconv

import (
	"fmt"
	"strconv"

	"git.um-react.app/um/um-conv/app/protocol"
)

func (f *FFmpeg) GetProfileEncoderCodec(profile *protocol.OutputProfile) (codec string, err error) {
	switch profile.Format {
	case protocol.FormatMP3:
		codec = "libmp3lame"
	case protocol.FormatM4A:
		if !f.settings.FFmpeg.AACEncoder.IsSet() {
			return f.SelectEncoder(string(protocol.AACEncoderFDK), string(protocol.AACEncoderAAC))
		}
		codec = string(f.settings.FFmpeg.AACEncoder)
	case protocol.FormatWAV:
		codec = "pcm_s16le"
	case protocol.FormatFLAC:
		codec = "flac"
	case protocol.FormatOGG:
		if !f.settings.FFmpeg.OGGEncoder.IsSet() {
			return f.SelectEncoder(string(protocol.OGGEncoderOpus), string(protocol.OGGEncoderVorbis))
		}
		codec = string(f.settings.FFmpeg.OGGEncoder)
	default:
		return "", fmt.Errorf("unsupported format: %s", profile.Format)
	}

	if codec == "" || !f.IsAudioEncoderSupported(codec) {
		return "", fmt.Errorf("unsupported encoder: %s", codec)
	}
	return codec, nil
}

func (f *FFmpeg) GetProfileEncodeExt(profile *protocol.OutputProfile) (ext string) {
	return string(profile.Format)
}

func (f *FFmpeg) SelectEncoder(encoders ...string) (string, error) {
	for _, encoder := range encoders {
		if f.IsAudioEncoderSupported(encoder) {
			return encoder, nil
		}
	}
	return "", fmt.Errorf("none of the encoders are supported: %v", encoders)
}

func selectAudioQuality[T any](level protocol.AudioQuality, high, medium, low T) T {
	switch level {
	case protocol.AudioQualityMedium:
		return medium
	case protocol.AudioQualityLow:
		return low
	}
	return high
}

func (f *FFmpeg) GetExtraConvertArgs(profile *protocol.OutputProfile, coverMap string) (args []string, err error) {
	codec, err := f.GetProfileEncoderCodec(profile)
	if err != nil {
		return
	}

	args = append(args, "-c:a", codec)

	switch profile.Format {
	case protocol.FormatWAV:
		args = append(args, "-rf64", "auto")
	case protocol.FormatFLAC:
		args = append(args, "-compression_level", "8")
		args = append(args, "-map", coverMap, "-c:v", "copy", "-disposition:v", "attached_pic")
	case protocol.FormatMP3:
		args = append(args, "-id3v2_version", "3", "-ar", "44100")
		args = append(args,
			// 车机兼容: 封面缩放到最长 500px 以内的 jpg 图片
			"-map", coverMap,
			"-vf", "scale=w='min(500,iw)':h='min(500,ih)':force_original_aspect_ratio=decrease",
			"-c:v", "mjpeg",
			"-q:v", "2",
			"-pix_fmt", "yuvj420p",
			"-disposition:v", "attached_pic",
		)
		bitrate := selectAudioQuality(f.settings.AudioQuality, 320, 192, 128)
		args = append(args, "-b:a", fmt.Sprintf("%dk", bitrate))
	case protocol.FormatOGG:
		switch protocol.OGGEncoder(codec) {
		case protocol.OGGEncoderOpus:
			quality := selectAudioQuality(f.settings.AudioQuality, 192, 128, 96)
			args = append(args, "-vbr", "on", "-b:a", fmt.Sprintf("%dk", quality))
		case protocol.OGGEncoderVorbis:
			quality := selectAudioQuality(f.settings.AudioQuality, 8, 6, 4)
			args = append(args, "-q:a", strconv.Itoa(quality))
		default:
			return nil, fmt.Errorf("unsupported OGG encoder: %s", codec)
		}
	case protocol.FormatM4A:
		args = append(args, "-movflags", "+faststart")
		args = append(args, "-map", coverMap, "-c:v", "copy", "-disposition:v", "attached_pic")
		if protocol.AACEncoder(codec) == protocol.AACEncoderFDK && f.settings.FFmpeg.AACFdkWithVBR {
			vbr := selectAudioQuality(f.settings.AudioQuality, 5, 4, 3)
			args = append(args, "-vbr", fmt.Sprintf("%d", vbr))
		} else {
			bitrate := selectAudioQuality(f.settings.AudioQuality, 256, 192, 128)
			args = append(args, "-b:a", fmt.Sprintf("%dk", bitrate))
		}
	}
	return
}
