package kgm

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
	"github.com/ncruces/go-sqlite3"
)

func TestLegacyAndUnsupportedVersionsSkipDatabase(t *testing.T) {
	for _, tc := range []struct {
		name, info, wantError string
	}{
		{"v2", `{"cryptoVersion":2}`, ""},
		{"v3", `{"cryptoVersion":3}`, ""},
		{"unsupported", `{"cryptoVersion":4}`, "不支持酷狗加密版本 4"},
		{"invalid JSON", "invalid", "无法解析酷狗音频信息"},
		{"missing hash", `{"cryptoVersion":5}`, "缺少 audioHash"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			src, dest := filepath.Join(dir, "歌曲 VPR.VPR"), filepath.Join(dir, "output")
			a := New(t.Context(), &protocol.Settings{})
			a.keys = func() (map[string]string, error) {
				t.Fatal("database lookup should not run")
				return nil, nil
			}
			a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
				if reflect.DeepEqual(args, []string{"kgm", "-I", "--", src}) {
					return cmd.CallResult{Stdout: tc.info}, nil
				}
				if tc.wantError != "" || !reflect.DeepEqual(args, []string{"kgm", "--output", dest, "--", src}) {
					t.Fatalf("unexpected arguments: %q", args)
				}
				return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
			}
			result, err := a.Decrypt(src, dest, nil)
			if tc.wantError != "" {
				if err == nil || !strings.Contains(err.Error(), tc.wantError) {
					t.Fatalf("Decrypt error = %v, want %q", err, tc.wantError)
				}
			} else if err != nil || result.AudioPath != dest {
				t.Fatalf("Decrypt = %+v, %v", result, err)
			}
		})
	}
}

func TestDecryptUsesCallSettingsWithoutMutatingAlgo(t *testing.T) {
	dest := filepath.Join(t.TempDir(), "output")
	a := New(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "initial.exe"}})
	a.run = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "override.exe" {
			t.Fatalf("program = %q, want override.exe", program)
		}
		if args[1] == "-I" {
			return cmd.CallResult{Stdout: `{"cryptoVersion":2}`}, nil
		}
		return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
	}
	override := &protocol.Settings{Binaries: protocol.BinariesSettings{UmCliRs: "override.exe"}}
	if _, err := a.Decrypt("-song.kgm", dest, override); err != nil {
		t.Fatal(err)
	}
	if a.settings.Binaries.UmCliRs != "initial.exe" {
		t.Fatalf("Decrypt mutated settings: %q", a.settings.Binaries.UmCliRs)
	}
}

func TestDecryptRequiresSettings(t *testing.T) {
	a := New(t.Context(), nil)
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("run must not be called without settings")
		return cmd.CallResult{}, nil
	}
	if _, err := a.Decrypt("song.kgm", "dest", nil); err == nil || !strings.Contains(err.Error(), "酷狗解密缺少配置") {
		t.Fatalf("error = %v", err)
	}
}

func TestEncryptedDatabaseIsReadOnceAndCleanedBeforeAudioDecrypt(t *testing.T) {
	dbPath, temp := testPaths(t)
	fixture := filepath.Join(t.TempDir(), "plain.db")
	seedKeys(t, fixture)
	plaintext, err := os.ReadFile(fixture)
	if err != nil {
		t.Fatal(err)
	}
	writeTestFile(t, dbPath, []byte("encrypted input"))

	a := New(t.Context(), &protocol.Settings{TempDir: temp})
	databaseProbes, databaseDecryptions := 0, 0
	var tempDB string
	a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		switch args[1] {
		case "-I":
			if reflect.DeepEqual(args, []string{"kgm", "-I", "--file-mode", "db", "--", dbPath}) {
				databaseProbes++
				return cmd.CallResult{Stdout: `{"encrypted":true}`}, nil
			}
			return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"hash"}`}, nil
		case "--file-mode":
			databaseDecryptions++
			tempDB = args[4]
			if !reflect.DeepEqual(args, []string{"kgm", "--file-mode", "db", "--output", tempDB, "--", dbPath}) {
				t.Errorf("unexpected DB arguments: %q", args)
			}
			if filepath.Dir(tempDB) != temp || filepath.Ext(tempDB) != ".db" {
				t.Errorf("expected a .db file directly in the temp directory, got %q", tempDB)
			}
			return cmd.CallResult{}, os.WriteFile(tempDB, plaintext, 0o600)
		case "--output":
			requireRemoved(t, tempDB)
			if len(args) != 7 || args[3] != "--ekey" || args[4] != "Zmlyc3Q=" || args[5] != "--" {
				t.Fatalf("unexpected audio arguments: %q", args)
			}
			writeTestFile(t, args[2], []byte("audio"))
		default:
			t.Fatalf("unexpected arguments: %q", args)
		}
		return cmd.CallResult{}, nil
	}
	for _, src := range []string{"first.kgg", "second.kgma"} {
		dest := filepath.Join(temp, src+".audio")
		if result, err := a.Decrypt(src, dest, nil); err != nil || result.AudioPath != dest {
			t.Fatalf("Decrypt = %+v, %v", result, err)
		}
	}
	if databaseProbes != 1 || databaseDecryptions != 1 {
		t.Fatalf("database probes = %d, decryptions = %d, want 1 each", databaseProbes, databaseDecryptions)
	}
}

func TestMissingDatabaseIsCachedUntilNextBatch(t *testing.T) {
	dbPath, temp := testPaths(t)
	settings := &protocol.Settings{TempDir: temp}
	databaseProbes := 0
	runner := func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		switch {
		case reflect.DeepEqual(args, []string{"kgm", "-I", "--file-mode", "db", "--", dbPath}):
			databaseProbes++
			if databaseProbes == 1 {
				return cmd.CallResult{ExitCode: 1, Stderr: "database file not found"}, nil
			}
			return cmd.CallResult{Stdout: `{"encrypted":false}`}, nil
		case reflect.DeepEqual(args, []string{"kgm", "-I", "--", "song.kgg"}):
			return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"missing"}`}, nil
		default:
			t.Fatalf("unexpected arguments: %q", args)
			return cmd.CallResult{}, nil
		}
	}
	batch := New(t.Context(), settings)
	batch.run = runner
	batch.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run when device keys are disabled")
		return cmd.CallResult{}, nil
	}
	_, firstErr := batch.Decrypt("song.kgg", "unused", nil)
	if firstErr == nil || !strings.Contains(firstErr.Error(), "database file not found") {
		t.Fatalf("first batch missing DB error = %v", firstErr)
	}

	seedKeys(t, dbPath)
	if _, err := batch.Decrypt("song.kgg", "unused", nil); err != firstErr || databaseProbes != 1 {
		t.Fatalf("first batch cached error = %v", err)
	}
	next := New(t.Context(), settings)
	next.run = runner
	next.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run when device keys are disabled")
		return cmd.CallResult{}, nil
	}
	if _, err := next.Decrypt("song.kgg", "unused", nil); err == nil || !strings.Contains(err.Error(), "找不到音频密钥") {
		t.Fatalf("second batch missing key error = %v", err)
	}
	if databaseProbes != 2 {
		t.Fatalf("database probes = %d, want 2", databaseProbes)
	}
}

func TestTemporaryCleanupOnFailureAndCancellation(t *testing.T) {
	for _, stage := range []string{"CLI error", "SQLite query error", "canceled database", "canceled audio", "audio error"} {
		t.Run(stage, func(t *testing.T) {
			dbPath, temp := testPaths(t)
			audioFailure := stage == "canceled audio" || stage == "audio error"
			if audioFailure {
				seedKeys(t, dbPath)
			} else {
				writeTestFile(t, dbPath, []byte("encrypted input"))
			}
			ctx, cancel := context.WithCancel(t.Context())
			defer cancel()
			a := New(ctx, &protocol.Settings{TempDir: temp})
			var tempPath string
			a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
				switch args[1] {
				case "-I":
					if len(args) > 4 && args[2] == "--file-mode" {
						if audioFailure {
							return cmd.CallResult{Stdout: `{"encrypted":false}`}, nil
						}
						return cmd.CallResult{Stdout: `{"encrypted":true}`}, nil
					}
					return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"hash"}`}, nil
				case "--file-mode":
					tempPath = args[4]
					db, err := sqlite3.Open(tempPath)
					if err != nil {
						return cmd.CallResult{}, err
					}
					err = errors.Join(db.Exec("CREATE TABLE OtherTable (unused TEXT)"), db.Close())
					if err != nil {
						return cmd.CallResult{}, err
					}
					if stage == "canceled database" {
						cancel()
					}
					if stage != "SQLite query error" {
						return cmd.CallResult{ExitCode: 1}, nil
					}
				case "--output":
					if stage == "canceled audio" {
						cancel()
					}
					return cmd.CallResult{ExitCode: 1, Stderr: args[4]}, nil
				default:
					t.Fatalf("unexpected arguments: %q", args)
				}
				return cmd.CallResult{}, nil
			}

			_, err := a.Decrypt("song.kgg", filepath.Join(temp, "output"), nil)
			if err == nil || (strings.HasPrefix(stage, "canceled") && !errors.Is(err, context.Canceled)) {
				t.Fatalf("%s: unexpected error %v", stage, err)
			}
			if strings.Contains(err.Error(), "Zmlyc3Q=") {
				t.Fatal("audio error exposed the key")
			}
			if !audioFailure {
				requireRemoved(t, tempPath)
			}
			if entries, err := os.ReadDir(temp); err != nil || len(entries) != 0 {
				t.Fatalf("temporary directory entries = %v, %v", entries, err)
			}
		})
	}
}

func testPaths(t *testing.T) (dbPath, temp string) {
	t.Helper()
	config := t.TempDir()
	for _, name := range []string{"APPDATA", "XDG_CONFIG_HOME", "HOME"} {
		t.Setenv(name, config)
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		t.Fatal(err)
	}
	dir := filepath.Join(configDir, "Kugou8")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	return filepath.Join(dir, "KGMusicV3.db"), t.TempDir()
}

func seedKeys(t *testing.T, path string) {
	t.Helper()
	db, err := sqlite3.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	err = errors.Join(db.Exec("CREATE TABLE ShareFileItems (EncryptionKeyId TEXT, EncryptionKey TEXT);"+
		"INSERT INTO ShareFileItems VALUES ('hash', NULL), ('hash', ''), ('hash', 'Zmlyc3Q='), ('hash', 'c2Vjb25k');"), db.Close())
	if err != nil {
		t.Fatal(err)
	}
}

func writeTestFile(t *testing.T, path string, data []byte) {
	t.Helper()
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}
}

func requireRemoved(t *testing.T, path string) {
	t.Helper()
	if _, err := os.Stat(path); path == "" || !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("temporary path %q was not removed: %v", path, err)
	}
}
