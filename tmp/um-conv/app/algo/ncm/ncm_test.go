package ncm

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

func TestDecryptExtractsOptionalArtifacts(t *testing.T) {
	dir := t.TempDir()
	dest := filepath.Join(dir, "decrypted")
	var gotProgram string
	var gotArgs []string
	algo := &Algo{
		settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
		run: func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
			gotProgram = program
			gotArgs = append([]string(nil), args...)
			for path, content := range map[string][]byte{
				dest:                    []byte("audio"),
				dest + ".cover":         []byte("image"),
				dest + ".metadata.json": []byte(`music:{"musicName":"越过山丘","artist":[["杨宗纬","6066"]],"album":"越过山丘"}`),
			} {
				if err := os.WriteFile(path, content, 0o600); err != nil {
					return cmd.CallResult{}, err
				}
			}
			return cmd.CallResult{}, nil
		},
	}

	got, err := algo.Decrypt("input.ncm", dest, nil)
	if err != nil {
		t.Fatal(err)
	}
	wantArgs := []string{"ncm", "--output", dest, "-c", dest + ".cover", "-m", dest + ".metadata.json", "--", "input.ncm"}
	if gotProgram != "um_cli_rs.exe" || !reflect.DeepEqual(gotArgs, wantArgs) {
		t.Fatalf("command = %q %q, want %q %q", gotProgram, gotArgs, "um_cli_rs.exe", wantArgs)
	}
	want := protocol.DecryptResult{AudioPath: dest, CoverPath: dest + ".cover", MetadataPath: dest + ".metadata.txt"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("result = %+v, want %+v", got, want)
	}
	gotMetadata, err := os.ReadFile(got.MetadataPath)
	if err != nil {
		t.Fatal(err)
	}
	wantMetadata := ";FFMETADATA1\ntitle=越过山丘\nalbum=越过山丘\nartist=杨宗纬\n"
	if string(gotMetadata) != wantMetadata {
		t.Fatalf("metadata = %q, want %q", gotMetadata, wantMetadata)
	}
	if _, err := os.Stat(dest + ".metadata.json"); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("stat raw metadata: got %v, want file not found", err)
	}
}

func TestDecryptAllowsMissingOptionalArtifacts(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "decrypted")
	algo := &Algo{
		settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
		run: func(context.Context, string, []string) (cmd.CallResult, error) {
			return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
		},
	}

	got, err := algo.Decrypt("input.ncm", dest, nil)
	if err != nil {
		t.Fatal(err)
	}
	if got.AudioPath != dest || got.CoverPath != "" || got.MetadataPath != "" {
		t.Fatalf("unexpected result: %+v", got)
	}
}

func TestDecryptRequiresAudioOutput(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "decrypted")
	algo := &Algo{
		settings: &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}},
		run:      func(context.Context, string, []string) (cmd.CallResult, error) { return cmd.CallResult{}, nil },
	}

	_, err := algo.Decrypt("input.ncm", dest, nil)
	if err == nil || !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("error = %v, want missing output error", err)
	}
}

func TestDecryptSeparatesDashPrefixedSource(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "decrypted")
	src := "-input.ncm"
	algo := New(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "initial.exe"}})
	algo.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "override.exe" {
			t.Fatalf("program = %q, want override.exe", program)
		}
		if len(args) < 2 || args[len(args)-2] != "--" || args[len(args)-1] != src {
			t.Fatalf("args = %q, want trailing -- %s", args, src)
		}
		return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
	}

	override := &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "override.exe"}}
	if _, err := algo.Decrypt(src, dest, override); err != nil {
		t.Fatal(err)
	}
	if algo.settings.Binaries.UmCliRs != "initial.exe" {
		t.Fatalf("Decrypt mutated settings: %q", algo.settings.Binaries.UmCliRs)
	}
}

func TestDecryptRequiresSettings(t *testing.T) {
	algo := New(t.Context(), nil)
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("run must not be called without settings")
		return cmd.CallResult{}, nil
	}
	if _, err := algo.Decrypt("input.ncm", "dest", nil); err == nil {
		t.Fatal("expected nil settings error")
	}
}

func TestDecryptCancellation(t *testing.T) {
	settings := &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"}}

	t.Run("before run", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		cancel()
		algo := New(ctx, settings)
		algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
			t.Fatal("cancelled Decrypt must not run um_cli_rs")
			return cmd.CallResult{}, nil
		}
		if _, err := algo.Decrypt("input.ncm", "dest", nil); !errors.Is(err, context.Canceled) {
			t.Fatalf("error = %v, want context.Canceled", err)
		}
	})

	t.Run("during run", func(t *testing.T) {
		ctx, cancel := context.WithCancel(t.Context())
		defer cancel()
		algo := New(ctx, settings)
		algo.run = func(runCtx context.Context, _ string, _ []string) (cmd.CallResult, error) {
			if runCtx != ctx {
				t.Fatal("run did not receive the algorithm context")
			}
			cancel()
			return cmd.CallResult{ExitCode: 1}, context.Canceled
		}
		if _, err := algo.Decrypt("input.ncm", "dest", nil); !errors.Is(err, context.Canceled) {
			t.Fatalf("error = %v, want context.Canceled", err)
		}
	})
}
