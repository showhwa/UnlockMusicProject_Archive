package fileopen

import (
	"strings"
	"testing"
)

func TestFileURLEncodesSpecialCharacters(t *testing.T) {
	got := fileURL("/home/user/My Music/a&b #1 100%.mp3")
	want := "file:///home/user/My%20Music/a&b%20%231%20100%25.mp3"
	if got != want {
		t.Fatalf("fileURL() = %q, want %q", got, want)
	}
}

func TestDBusFileURIEscapesCommas(t *testing.T) {
	cases := map[string]string{
		"/home/user/Artist, Feat.mp3":    "file:///home/user/Artist%2C%20Feat.mp3",
		"/home/user/a,b/c,d.mp3":         "file:///home/user/a%2Cb/c%2Cd.mp3",
		"/home/user/My Music/a&b #1.mp3": "file:///home/user/My%20Music/a&b%20%231.mp3",
	}
	for in, want := range cases {
		got := dbusFileURI(in)
		if got != want {
			t.Fatalf("dbusFileURI(%q) = %q, want %q", in, got, want)
		}
		if strings.Contains(got, ",") {
			t.Fatalf("dbusFileURI(%q) = %q still contains a comma", in, got)
		}
	}
}
