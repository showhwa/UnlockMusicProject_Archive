package probe

import "testing"

func TestParseFFmpegVersion(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"ffmpeg version n7.0 Copyright (c) 2000-2024", "n7.0"},
		{"ffmpeg version 6.1.1 Copyright (c) 2000-2023", "6.1.1"},
		{"ffmpeg version 9.0-full_build-www.gyan.dev Copyright", "9.0-full_build-www.gyan.dev"},
		{"not a version line\n", ""},
		{"", ""},
	}
	for _, tc := range cases {
		got := parseFFmpegVersion(tc.in)
		if got != tc.want {
			t.Errorf("parseFFmpegVersion(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
