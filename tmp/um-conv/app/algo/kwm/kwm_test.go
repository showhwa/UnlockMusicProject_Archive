package kwm

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

const (
	sampleV1Info = `{"magic":"yeelion-kuwo","version":1,"unknown1":0,"resourceId":440616,"unknown2":"\u0000\u0000\u0000\u0000ý6¾}\\;","formatName":"2000FLAC"}`
	sampleV2Info = `{"magic":"yeelion-kuwo-tme","version":2,"unknown1":0,"resourceId":440615,"unknown2":"\u0000\u0000\u0000\u0000° ª\u0000\u0000\u0000\u0000;¿","formatName":"20900kmflac"}`
)

func TestDeepProbe(t *testing.T) {
	dir := t.TempDir()
	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"},
	})
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("suffix DeepProbe must not invoke um_cli_rs")
		return cmd.CallResult{}, nil
	}
	for _, name := range []string{"missing.kwm", "missing.mflac", "missing.MGG", "song.mp3"} {
		path := filepath.Join(dir, name)
		got, err := a.DeepProbe(t.Context(), path)
		want := name != "song.mp3"
		if err != nil || got != want {
			t.Fatalf("DeepProbe(%q) = (%v, %v), want (%v, nil)", path, got, err, want)
		}
	}

	flac := filepath.Join(dir, "song.FLAC")
	tests := []struct {
		name     string
		result   cmd.CallResult
		runErr   error
		settings *protocol.Settings
		want     bool
	}{
		{
			name:     "v1 info",
			settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			result:   cmd.CallResult{Stdout: sampleV1Info},
			want:     true,
		},
		{
			name:     "v2 info",
			settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			result:   cmd.CallResult{Stdout: sampleV2Info},
			want:     true,
		},
		{
			name:     "cli rejects file",
			settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			result:   cmd.CallResult{ExitCode: 1, Stderr: "not kuwo"},
			want:     false,
		},
		{
			name:     "invalid json",
			settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			result:   cmd.CallResult{Stdout: "not-json"},
			want:     false,
		},
		{
			name:     "missing binary",
			settings: &protocol.Settings{},
			want:     false,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			probe := New(t.Context(), tc.settings)
			called := false
			probe.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
				called = true
				if program != "um_cli_rs.exe" {
					t.Fatalf("program = %q", program)
				}
				if !reflect.DeepEqual(args, []string{"kuwo", "-I", "--", flac}) {
					t.Fatalf("args = %q", args)
				}
				return tc.result, tc.runErr
			}
			got, err := probe.DeepProbe(t.Context(), flac)
			if err != nil || got != tc.want {
				t.Fatalf("DeepProbe() = (%v, %v), want (%v, nil)", got, err, tc.want)
			}
			if called != (tc.settings.Binaries.UmCliRs != "") {
				t.Fatalf("kuwo -I called = %v, want %v", called, tc.settings.Binaries.UmCliRs != "")
			}
		})
	}

	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	probe := New(ctx, &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}})
	probe.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("cancelled DeepProbe must not invoke um_cli_rs")
		return cmd.CallResult{}, nil
	}
	_, err := probe.DeepProbe(ctx, flac)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("DeepProbe() error = %v, want context.Canceled", err)
	}
}

func TestSupportedExtensions(t *testing.T) {
	a := New(t.Context(), &protocol.Settings{})
	want := []string{".kwm", ".mflac", ".mgg"}
	if got := a.GetSupportedExtensions(); !reflect.DeepEqual(got, want) {
		t.Fatalf("GetSupportedExtensions() = %v, want %v", got, want)
	}
}

func TestDecryptV1(t *testing.T) {
	dir := t.TempDir()
	src := filepath.Join(dir, "-song.kwm")
	dest := filepath.Join(dir, "output")

	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{UmCliRs: "initial.exe"},
	})
	overrideSettings := &protocol.Settings{
		Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"},
	}

	var calls [][]string
	a.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "um_cli_rs.exe" {
			t.Fatalf("program = %q, want %q", program, "um_cli_rs.exe")
		}
		calls = append(calls, append([]string(nil), args...))
		switch len(calls) {
		case 1:
			if !reflect.DeepEqual(args, []string{"kuwo", "-I", "--", src}) {
				t.Fatalf("probe args = %q", args)
			}
			return cmd.CallResult{Stdout: sampleV1Info}, nil
		case 2:
			if !reflect.DeepEqual(args, []string{"kuwo", "--output", dest, "--", src}) {
				t.Fatalf("decrypt args = %q", args)
			}
			return cmd.CallResult{}, os.WriteFile(dest, []byte("flac"), 0o600)
		default:
			t.Fatalf("unexpected call #%d: %q", len(calls), args)
			return cmd.CallResult{}, nil
		}
	}

	result, err := a.Decrypt(src, dest, overrideSettings)
	if err != nil {
		t.Fatalf("Decrypt error = %v", err)
	}
	if result.AudioPath != dest || result.CoverPath != "" || result.MetadataPath != "" {
		t.Fatalf("Decrypt result = %+v, want AudioPath=%q", result, dest)
	}
	if len(calls) != 2 {
		t.Fatalf("call count = %d, want 2", len(calls))
	}
}

func TestDecryptUnsupportedAndErrors(t *testing.T) {
	tests := []struct {
		name      string
		settings  *protocol.Settings
		initSet   *protocol.Settings
		probeRes  cmd.CallResult
		probeErr  error
		decRes    cmd.CallResult
		decErr    error
		wantErr   string
		wantCalls int
	}{
		{
			name:      "v2 requires adb keys",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{Stdout: sampleV2Info},
			wantErr:   "酷我 v2 加密格式需要允许使用 adb 从设备获取密钥",
			wantCalls: 1,
		},
		{
			name: "v2 missing resourceId",
			initSet: &protocol.Settings{
				Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe", AllowAdbKeys: true},
			},
			probeRes:  cmd.CallResult{Stdout: `{"version":2,"formatName":"20900kmflac"}`},
			wantErr:   "酷我 v2 音频信息缺少 resourceId 或 formatName",
			wantCalls: 1,
		},
		{
			name: "v2 missing formatName",
			initSet: &protocol.Settings{
				Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe", AllowAdbKeys: true},
			},
			probeRes:  cmd.CallResult{Stdout: `{"version":2,"resourceId":38525528}`},
			wantErr:   "酷我 v2 音频信息缺少 resourceId 或 formatName",
			wantCalls: 1,
		},
		{
			name:      "version 0 unsupported",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{Stdout: `{"version":0}`},
			wantErr:   "不支持酷我加密版本 0",
			wantCalls: 1,
		},
		{
			name:      "version 3 unsupported",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{Stdout: `{"version":3}`},
			wantErr:   "不支持酷我加密版本 3",
			wantCalls: 1,
		},
		{
			name:      "invalid JSON",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{Stdout: "invalid"},
			wantErr:   "无法解析酷我音频信息",
			wantCalls: 1,
		},
		{
			name:      "probe CLI failure",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{ExitCode: 1, Stderr: "bad header"},
			wantErr:   "无法读取酷我音频信息",
			wantCalls: 1,
		},
		{
			name:      "decrypt CLI failure",
			initSet:   &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
			probeRes:  cmd.CallResult{Stdout: sampleV1Info},
			decRes:    cmd.CallResult{ExitCode: 2, Stderr: "decrypt failed"},
			wantErr:   "酷我音频解密失败",
			wantCalls: 2,
		},
		{
			name:      "nil settings",
			wantErr:   "酷我解密缺少配置",
			wantCalls: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			a := New(t.Context(), tc.initSet)
			calls := 0
			a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
				calls++
				if calls == 1 {
					return tc.probeRes, tc.probeErr
				}
				if calls == 2 {
					return tc.decRes, tc.decErr
				}
				t.Fatalf("unexpected extra call #%d: %q", calls, args)
				return cmd.CallResult{}, nil
			}

			_, err := a.Decrypt("song.kwm", filepath.Join(t.TempDir(), "out"), tc.settings)
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("Decrypt error = %v, want %q", err, tc.wantErr)
			}
			if calls != tc.wantCalls {
				t.Fatalf("call count = %d, want %d", calls, tc.wantCalls)
			}
		})
	}
}

func TestDecryptCancellation(t *testing.T) {
	for _, stage := range []string{"probe", "decrypt"} {
		t.Run(stage, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()

			a := New(ctx, &protocol.Settings{
				Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"},
			})
			a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
				if args[1] == "-I" {
					if stage == "probe" {
						cancel()
						return cmd.CallResult{ExitCode: 1}, context.Canceled
					}
					return cmd.CallResult{Stdout: sampleV1Info}, nil
				}
				cancel()
				return cmd.CallResult{ExitCode: 1}, context.Canceled
			}

			_, err := a.Decrypt("song.kwm", filepath.Join(t.TempDir(), "out"), nil)
			if !errors.Is(err, context.Canceled) {
				t.Fatalf("Decrypt error = %v, want context.Canceled", err)
			}
		})
	}
}

func TestDecryptOutputValidation(t *testing.T) {
	tests := []struct {
		name    string
		prepare func(t *testing.T, dest string)
		wantErr string
	}{
		{
			name:    "missing output",
			prepare: func(*testing.T, string) {},
			wantErr: "无法读取解密产物",
		},
		{
			name: "empty output",
			prepare: func(t *testing.T, dest string) {
				if err := os.WriteFile(dest, nil, 0o600); err != nil {
					t.Fatal(err)
				}
			},
			wantErr: "解密产物为空",
		},
		{
			name: "directory output",
			prepare: func(t *testing.T, dest string) {
				if err := os.Mkdir(dest, 0o755); err != nil {
					t.Fatal(err)
				}
			},
			wantErr: "解密产物不是普通文件",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dest := filepath.Join(t.TempDir(), "out")
			a := New(t.Context(), &protocol.Settings{
				Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"},
			})
			a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
				if args[1] == "-I" {
					return cmd.CallResult{Stdout: sampleV1Info}, nil
				}
				tc.prepare(t, dest)
				return cmd.CallResult{}, nil
			}

			_, err := a.Decrypt("song.kwm", dest, nil)
			if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
				t.Fatalf("Decrypt error = %v, want %q", err, tc.wantErr)
			}
		})
	}
}
