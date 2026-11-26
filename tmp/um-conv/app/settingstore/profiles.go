package settingstore

import "git.um-react.app/um/um-conv/app/protocol"

var outputProfiles = []protocol.OutputProfile{
	{ID: "mp3_cbr", Name: "MP3", Description: "兼容车机等老设备，固定码率的有损压缩", IsLossless: false, Format: protocol.FormatMP3},
	{ID: "aac", Name: "M4A", Description: "兼容苹果设备，使用 AAC 音频编码", IsLossless: false, Format: protocol.FormatM4A},
	{ID: "ogg", Name: "OGG", Description: "新兴开放格式，同码率下细节更多", IsLossless: false, Format: protocol.FormatOGG},
	{ID: "flac", Name: "FLAC", Description: "无损音频格式，无损压缩", IsLossless: true, Format: protocol.FormatFLAC},
	{ID: "wav", Name: "WAV", Description: "无损音频格式，无压缩，文件大", IsLossless: true, Format: protocol.FormatWAV},
}
