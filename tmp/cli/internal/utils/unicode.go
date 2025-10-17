package utils

import "golang.org/x/text/unicode/norm"

// normalizeUnicode normalizes unicode string to NFC.
// since macOS may change some characters in the file name.
// e.g. "ぜ"(e3 81 9c) -> "ぜ"(e3 81 9b e3 82 99)
func NormalizeUnicode(str string) string {
	return norm.NFC.String(str)
}
