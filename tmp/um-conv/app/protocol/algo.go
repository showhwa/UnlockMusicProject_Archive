package protocol

import (
	"context"
	"errors"
	"path/filepath"
	"strings"
)

var ErrSourceNotSupported = errors.New("source not supported")

type Algo interface {
	// Decrypt 解密源文件，如果源文件不支持，则返回 ErrSourceNotSupported
	Decrypt(src string, dest string, settings *Settings) (DecryptResult, error)

	// GetSupportedExtensions returns a list of supported extensions
	GetSupportedExtensions() []string

	// DeepProbe 报告该算法是否应解密 path。true 表示认领，调用方不再询问后续算法。
	DeepProbe(ctx context.Context, path string) (bool, error)

	// PopulateSupportedFormats writes this algorithm's display category into formats.
	// The map key is the category name shown on the about page; the values are the
	// labels shown in its tooltip. Callers pass a non-nil map. Each algorithm owns one category.
	PopulateSupportedFormats(formats map[string][]string)
}

// MatchesAnyExtension reports whether the base name ends with any extension.
// Matching is case-insensitive. Empty extensions never match.
func MatchesAnyExtension(path string, exts []string) bool {
	name := strings.ToLower(filepath.Base(path))
	for _, ext := range exts {
		ext = strings.ToLower(ext)
		if ext != "" && strings.HasSuffix(name, ext) {
			return true
		}
	}
	return false
}

// DecryptResult describes the decrypted audio and optional sidecar artifacts.
type DecryptResult struct {
	AudioPath    string
	CoverPath    string
	MetadataPath string // Optional FFmetadata file ready for FFmpeg.
}

// ActiveSettings returns the per-call override when set, otherwise the settings
// the algorithm was constructed with. The result may be nil; callers must check it.
// It never mutates the algorithm.
func ActiveSettings(base, override *Settings) *Settings {
	if override != nil {
		return override
	}
	return base
}
