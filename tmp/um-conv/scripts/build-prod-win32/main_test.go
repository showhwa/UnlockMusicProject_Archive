package main

import (
	"strings"
	"testing"
)

func TestResolveBuildIdentity(t *testing.T) {
	cases := []struct {
		name        string
		described   string
		describedOK bool
		short       string
		wantVersion string
		wantCommit  string
	}{
		{
			name:        "git describe failed",
			describedOK: false,
			short:       "abcdef1",
			wantVersion: "v0.0.0",
			wantCommit:  "custom",
		},
		{
			name:        "commits after tag",
			described:   "v1.0.0-3-gabcdef1\n",
			describedOK: true,
			short:       "abcdef1\n",
			wantVersion: "v1.0.0-3-gabcdef1",
			wantCommit:  "abcdef1",
		},
		{
			name:        "no tags fallback hash",
			described:   "abcdef1\n",
			describedOK: true,
			short:       "abcdef1\n",
			wantVersion: "abcdef1",
			wantCommit:  "abcdef1",
		},
		{
			name:        "empty describe",
			described:   "  ",
			describedOK: true,
			short:       "abcdef1",
			wantVersion: "v0.0.0",
			wantCommit:  "custom",
		},
		{
			name:        "exact tag",
			described:   "v1.0.0\n",
			describedOK: true,
			short:       "abcdef1\n",
			wantVersion: "v1.0.0",
			wantCommit:  "abcdef1",
		},
		{
			name:        "dirty tag",
			described:   "v1.0.0-dirty",
			describedOK: true,
			short:       "abcdef1",
			wantVersion: "v1.0.0-dirty",
			wantCommit:  "abcdef1",
		},
		{
			name:        "missing short hash",
			described:   "v1.0.0",
			describedOK: true,
			short:       "  ",
			wantVersion: "v1.0.0",
			wantCommit:  "custom",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			version, commit := resolveBuildIdentity(tc.described, tc.describedOK, tc.short)
			if version != tc.wantVersion || commit != tc.wantCommit {
				t.Fatalf("resolveBuildIdentity() = %q, %q; want %q, %q", version, commit, tc.wantVersion, tc.wantCommit)
			}
		})
	}
}

func TestImageBuildArgsIncludesVersion(t *testing.T) {
	args := imageBuildArgs("v1.0.0-dirty", "abcdef1", "--output", "type=local,dest=dist")
	joined := make(map[string]string)
	for i := 0; i < len(args)-1; i++ {
		if args[i] != "--build-arg" {
			continue
		}
		key, value, ok := strings.Cut(args[i+1], "=")
		if ok {
			joined[key] = value
		}
	}
	if joined["APP_VERSION"] != "v1.0.0-dirty" || joined["APP_COMMIT"] != "abcdef1" {
		t.Fatalf("build args = %#v", args)
	}
	if args[len(args)-1] != "." {
		t.Fatalf("context = %q, want .", args[len(args)-1])
	}
}
