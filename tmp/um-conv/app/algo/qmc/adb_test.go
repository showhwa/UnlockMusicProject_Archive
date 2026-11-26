package qmc

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
	"github.com/ncruces/go-sqlite3"
)

func TestSTagDisabledDoesNotCallAdb(t *testing.T) {
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{})
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"metadataType":"STag"}`}, nil
	}
	algo.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run while device keys are disabled")
		return cmd.CallResult{}, nil
	}
	_, err := algo.getEKey(algo.settings, filepath.Join(t.TempDir(), "song.mflac"))
	if err == nil || !strings.Contains(err.Error(), "QMC2 STag 需要允许使用 adb 从设备获取密钥") {
		t.Fatalf("error = %v", err)
	}
	// Batch ADB key policy follows constructor settings even if call override sets AllowAdbKeys.
	override := &protocol.Settings{Binaries: protocol.BinariesSettings{AllowAdbKeys: true}}
	if _, err := algo.getEKey(override, filepath.Join(t.TempDir(), "song.mflac")); err == nil || !strings.Contains(err.Error(), "QMC2 STag 需要允许使用 adb 从设备获取密钥") {
		t.Fatalf("override error = %v", err)
	}
}

func TestSTagAdbKeysLoadOnce(t *testing.T) {
	dir := t.TempDir()
	adbPath := filepath.Join(dir, "adb.exe")
	if err := os.WriteFile(adbPath, []byte("adb"), 0o644); err != nil {
		t.Fatal(err)
	}
	encoded := crlfBase64(t, gzipBytes(t, qmcDBBytes(t)))
	algo := NewQMPCAlgo(t.Context(), &protocol.Settings{
		TempDir:  dir,
		Binaries: protocol.BinariesSettings{Adb: adbPath, AllowAdbKeys: true},
	})
	algo.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"metadataType":"STag"}`}, nil
	}
	devices, shells := 0, 0
	if DeviceDBPath != "/data/data/com.tencent.qqmusic/databases/player_process_db" {
		t.Fatalf("DeviceDBPath = %q", DeviceDBPath)
	}
	shellArg := adb.WrapCommand("cat '" + DeviceDBPath + "'")
	algo.adbRun = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != adbPath {
			t.Fatalf("program = %q", program)
		}
		switch {
		case reflect.DeepEqual(args, []string{"devices"}):
			devices++
			return cmd.CallResult{Stdout: "List of devices attached\nemulator-5554\tdevice\n"}, nil
		case reflect.DeepEqual(args, []string{"-s", "emulator-5554", "shell", shellArg}):
			shells++
			return cmd.CallResult{Stdout: encoded}, nil
		default:
			t.Fatalf("args = %q", args)
			return cmd.CallResult{}, nil
		}
	}

	ekey, err := algo.getEKey(algo.settings, filepath.Join(dir, "a.mflac"))
	if err != nil || ekey != "ekey-a" {
		t.Fatalf("getEKey = %q, %v", ekey, err)
	}
	_, err = algo.getEKey(algo.settings, filepath.Join(dir, "missing.mflac"))
	if err == nil || !strings.Contains(err.Error(), "找不到文件 missing.mflac 的 ekey") {
		t.Fatalf("missing file error = %v", err)
	}
	if devices != 1 || shells != 1 {
		t.Fatalf("devices = %d, shells = %d, want 1 each", devices, shells)
	}
	matches, err := filepath.Glob(filepath.Join(dir, "um-conv-qmc-adb-*.db"))
	if err != nil || len(matches) != 0 {
		t.Fatalf("temporary databases = %v, %v", matches, err)
	}
}

func qmcDBBytes(t *testing.T) []byte {
	t.Helper()
	path := filepath.Join(t.TempDir(), "player.db")
	db, err := sqlite3.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	err = db.Exec(`
		CREATE TABLE audio_file_ekey_table (file_path TEXT, ekey TEXT);
		INSERT INTO audio_file_ekey_table VALUES ('/sdcard/Music/a.mflac', 'ekey-a');
	`)
	if closeErr := db.Close(); err != nil || closeErr != nil {
		t.Fatalf("seed: %v, close: %v", err, closeErr)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return data
}

func gzipBytes(t *testing.T, data []byte) []byte {
	t.Helper()
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	if _, err := zw.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func crlfBase64(t *testing.T, data []byte) string {
	t.Helper()
	encoded := base64.StdEncoding.EncodeToString(data)
	var b strings.Builder
	for i := 0; i < len(encoded); i += 16 {
		end := i + 16
		if end > len(encoded) {
			end = len(encoded)
		}
		if i > 0 {
			b.WriteString("\r\n")
		}
		b.WriteString(encoded[i:end])
	}
	return b.String()
}
