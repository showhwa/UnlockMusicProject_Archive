package main

import (
	"path/filepath"
	"slices"
	"strings"
)

// knownNonMusicExts are common non-audio suffixes to skip when walking dirs.
var knownNonMusicExts = []string{
	"",
	".txt",
	".mmkv",
	".exe",
	".dll",
}

func isKnownNonMusicExt(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	return slices.Contains(knownNonMusicExts, ext)
}
