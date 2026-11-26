package protocol

// Container format (i.e. file extension) of the output file
type Format string

const (
	FormatNone Format = "none"
	FormatMP3  Format = "mp3"
	FormatM4A  Format = "m4a"
	FormatWAV  Format = "wav"
	FormatFLAC Format = "flac"
	FormatOGG  Format = "ogg"
)

// AudioQuality is a quality tier enum (not a bitrate): 0 lossless, 1 low, 2 medium, 3 high.
type AudioQuality int

const (
	AudioQualityLossless AudioQuality = 0
	AudioQualityLow      AudioQuality = 1
	AudioQualityMedium   AudioQuality = 2
	AudioQualityHigh     AudioQuality = 3
)

// IsValid reports whether q is a defined quality tier.
func (q AudioQuality) IsValid() bool {
	switch q {
	case AudioQualityLossless, AudioQualityLow, AudioQualityMedium, AudioQualityHigh:
		return true
	default:
		return false
	}
}

// OutputProfile 可选输出格式
type OutputProfile struct {
	// Unique identifier for the profile
	ID string `json:"id"`
	// Human-readable name for the profile
	Name        string `json:"name"`
	Description string `json:"description"`
	Format      Format `json:"format"`
	IsLossless  bool   `json:"isLossless"`
}
