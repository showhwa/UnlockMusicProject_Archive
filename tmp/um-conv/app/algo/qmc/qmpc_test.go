package qmc

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

func fakeExecutable(t *testing.T, name string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(path, []byte("bin"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestDecryptSeparatesDashPrefixedSource(t *testing.T) {
	dir := t.TempDir()
	src := "-song.mflac"
	dest := filepath.Join(dir, "out")
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "initial.exe"}})
	var calls [][]string
	algo.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "override.exe" {
			t.Fatalf("program = %q, want override.exe", program)
		}
		calls = append(calls, append([]string(nil), args...))
		if len(calls) == 1 {
			return cmd.CallResult{Stdout: `{"metadataType":"QTag","ekey":"key"}`}, nil
		}
		return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
	}

	override := &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "override.exe"}}
	if _, err := algo.Decrypt(src, dest, override); err != nil {
		t.Fatal(err)
	}
	want := [][]string{
		{"qmc2", "-I", "--", src},
		{"qmc2", "--ekey", "key", "--output", dest, "--", src},
	}
	if !reflect.DeepEqual(calls, want) {
		t.Fatalf("calls = %q, want %q", calls, want)
	}
	if algo.settings.Binaries.UmCliRs != "initial.exe" {
		t.Fatalf("Decrypt mutated settings: %q", algo.settings.Binaries.UmCliRs)
	}
}

func TestDecryptRequiresSettings(t *testing.T) {
	algo := NewQMPCAlgo(t.Context(), nil)
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("run must not be called without settings")
		return cmd.CallResult{}, nil
	}
	if _, err := algo.Decrypt("song.mflac", "dest", nil); !errors.Is(err, errMissingSettings) {
		t.Fatalf("error = %v, want errMissingSettings", err)
	}
}

func TestDecryptWrapsEKeyError(t *testing.T) {
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{})
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"metadataType":"QTag"}`}, nil
	}
	_, err := algo.Decrypt("song.mflac", "dest", nil)
	if err == nil {
		t.Fatal("expected ekey error")
	}

	runErr := errors.New("spawn failed")
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{ExitCode: -1}, runErr
	}
	if _, err := algo.Decrypt("song.mflac", "dest", nil); !errors.Is(err, runErr) {
		t.Fatalf("error = %v, want wrapped %v", err, runErr)
	}
}

func TestDecryptCancellation(t *testing.T) {
	settings := &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}}

	t.Run("before run", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		cancel()
		algo := NewQMPCAlgo(ctx, settings)
		algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
			t.Fatal("cancelled Decrypt must not run um_cli_rs")
			return cmd.CallResult{}, nil
		}
		if _, err := algo.Decrypt("song.mflac", "dest", nil); !errors.Is(err, context.Canceled) {
			t.Fatalf("error = %v, want context.Canceled", err)
		}
	})

	for _, stage := range []string{"inspect", "decrypt"} {
		t.Run(stage, func(t *testing.T) {
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			algo := NewQMPCAlgo(ctx, settings)
			algo.run = func(runCtx context.Context, _ string, args []string) (cmd.CallResult, error) {
				if runCtx != ctx {
					t.Fatal("run did not receive the algorithm context")
				}
				if args[1] == "-I" && stage == "decrypt" {
					return cmd.CallResult{Stdout: `{"metadataType":"QTag","ekey":"key"}`}, nil
				}
				cancel()
				return cmd.CallResult{ExitCode: 1}, context.Canceled
			}
			_, err := algo.Decrypt("song.mflac", "dest", nil)
			if !errors.Is(err, context.Canceled) {
				t.Fatalf("error = %v, want context.Canceled", err)
			}
		})
	}
}

func TestMusicExEkeyUsesInjectedRunner(t *testing.T) {
	mmkv := fakeExecutable(t, "qmpc-mmkv-cli.exe")
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{QmpcMmkvCli: mmkv}})
	calls := 0
	algo.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != mmkv {
			t.Fatalf("program = %q, want %q", program, mmkv)
		}
		calls++
		if calls == 1 {
			return cmd.CallResult{ExitCode: 5}, nil
		}
		return cmd.CallResult{Stdout: "media.mflac\nsecret\n"}, nil
	}

	got, err := algo.GetMusicExEkeyByMediaFilename("media.mflac", 1)
	if err != nil || got != "secret" || calls != 2 {
		t.Fatalf("ekey = %q, %v after %d calls", got, err, calls)
	}
}

func TestMusicExEkeyStopsRetryingWhenCancelled(t *testing.T) {
	mmkv := fakeExecutable(t, "qmpc-mmkv-cli.exe")
	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	algo := NewQMPCAlgo(ctx, &protocol.Settings{Binaries: protocol.BinariesSettings{QmpcMmkvCli: mmkv}})
	calls := 0
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		calls++
		cancel()
		return cmd.CallResult{ExitCode: 5}, nil
	}

	_, err := algo.GetMusicExEkeyByMediaFilename("media.mflac", 5)
	if !errors.Is(err, context.Canceled) || calls != 1 {
		t.Fatalf("error = %v after %d calls, want context.Canceled after 1", err, calls)
	}
}
