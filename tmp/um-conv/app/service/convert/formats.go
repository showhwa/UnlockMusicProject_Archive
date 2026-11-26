package convert

import (
	"context"
	"path/filepath"
	"sort"
	"strings"

	"git.um-react.app/um/um-conv/app/protocol"
)

var mediaExts = map[string]struct{}{
	".mkv": {}, ".webm": {},
	".mp3": {}, ".wav": {}, ".flac": {}, ".aac": {}, ".m4a": {},
	".ogg": {}, ".wma": {},
}

var supportedInputExts = buildInputExtSet()

func buildInputExtSet() map[string]struct{} {
	exts := make(map[string]struct{}, len(mediaExts)+8)
	for ext := range mediaExts {
		exts[ext] = struct{}{}
	}
	for ext := range newAlgoRegistry(context.Background(), &protocol.Settings{}).exts {
		exts[ext] = struct{}{}
	}
	return exts
}

// MediaFormatLabels returns the plain media suffixes shown on the about page, without a leading dot.
func MediaFormatLabels() []string {
	labels := make([]string, 0, len(mediaExts))
	for ext := range mediaExts {
		labels = append(labels, strings.TrimPrefix(ext, "."))
	}
	sort.Strings(labels)
	return labels
}

func inputFilterGlob() string {
	keys := make([]string, 0, len(supportedInputExts))
	for ext := range supportedInputExts {
		keys = append(keys, "*"+ext)
	}
	sort.Strings(keys)
	return strings.Join(keys, ";")
}

func isMediaFile(path string) bool {
	ext, _ := longestSuffix(path, supportedInputExts)
	return ext != ""
}

// longestSuffix returns the longest registered suffix of the file name.
// song.mflac0.flac matches .mflac0.flac rather than .flac.
func longestSuffix[V any](path string, keys map[string]V) (string, V) {
	var zero V
	name := strings.ToLower(filepath.Base(path))
	best := ""
	for ext := range keys {
		if len(ext) > len(best) && strings.HasSuffix(name, ext) {
			best = ext
		}
	}
	if best == "" {
		return "", zero
	}
	return best, keys[best]
}
