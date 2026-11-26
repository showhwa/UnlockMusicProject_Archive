package qmc

import (
	"slices"
	"testing"
)

func TestQMCExtensionsIncludeNumberedSuffixesAndMMP4(t *testing.T) {
	exts := QMCExtensions()
	for _, ext := range []string{".mflac", ".mflac0", ".mflac9", ".mflaca", ".mflacz", ".mflac0.flac", ".mflac.flac", ".mflacz.flac", ".mgg", ".mgg0", ".mgga", ".mggz", ".mgg0.flac", ".mggz.flac", ".mmp4"} {
		if !slices.Contains(exts, ext) {
			t.Errorf("missing %s", ext)
		}
	}
	for _, ext := range []string{".mflac10", ".mflac10.flac", ".mmp4.flac", ".mmp40", ".mflacA", ".flac"} {
		if slices.Contains(exts, ext) {
			t.Errorf("unexpected %s", ext)
		}
	}
}
