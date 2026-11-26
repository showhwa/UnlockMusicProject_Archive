package kgm

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/binary"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

func TestV5LocalHitSkipsAdb(t *testing.T) {
	dir := t.TempDir()
	src, dest := filepath.Join(dir, "song.kgg"), filepath.Join(dir, "out")
	a := New(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{AllowAdbKeys: true}})
	a.keys = func() (map[string]string, error) {
		return map[string]string{"hash": "local-key"}, nil
	}
	a.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run when the local database has the key")
		return cmd.CallResult{}, nil
	}
	a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if reflect.DeepEqual(args, []string{"kgm", "-I", "--", src}) {
			return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"hash"}`}, nil
		}
		if !reflect.DeepEqual(args, []string{"kgm", "--output", dest, "--ekey", "local-key", "--", src}) {
			t.Fatalf("args = %q", args)
		}
		return cmd.CallResult{}, os.WriteFile(dest, []byte("audio"), 0o600)
	}
	if result, err := a.Decrypt(src, dest, nil); err != nil || result.AudioPath != dest {
		t.Fatalf("Decrypt = %+v, %v", result, err)
	}
}

func TestV5LocalMissUsesAdbOnce(t *testing.T) {
	dir := t.TempDir()
	adbPath := filepath.Join(dir, "adb.exe")
	if err := os.WriteFile(adbPath, []byte("adb"), 0o644); err != nil {
		t.Fatal(err)
	}
	payload := mmkvFile(mmkvEntry("hash-1", "key-1"), mmkvEntry("hash-2", "key-2"))
	encoded := crlfBase64(gzipBytes(t, payload))
	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{Adb: adbPath, AllowAdbKeys: true},
	})
	a.keys = func() (map[string]string, error) {
		return map[string]string{}, nil
	}
	devices, shells := 0, 0
	if DeviceKeyPath != "/data/data/com.kugou.android/files/mmkv/mggkey_multi_process" {
		t.Fatalf("DeviceKeyPath = %q", DeviceKeyPath)
	}
	shellArg := adb.WrapCommand("cat '" + DeviceKeyPath + "'")
	a.adbRun = func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
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
	a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		src := args[len(args)-1]
		hash, key := "hash-1", "key-1"
		if strings.Contains(src, "second") {
			hash, key = "hash-2", "key-2"
		}
		if args[1] == "-I" {
			return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"` + hash + `"}`}, nil
		}
		if !reflect.DeepEqual(args, []string{"kgm", "--output", args[2], "--ekey", key, "--", src}) {
			t.Fatalf("args = %q", args)
		}
		return cmd.CallResult{}, os.WriteFile(args[2], []byte("audio"), 0o600)
	}
	for _, name := range []string{"first.kgg", "second.kgg"} {
		dest := filepath.Join(dir, name+".audio")
		if result, err := a.Decrypt(filepath.Join(dir, name), dest, nil); err != nil || result.AudioPath != dest {
			t.Fatalf("Decrypt %s = %+v, %v", name, result, err)
		}
	}
	if devices != 1 || shells != 1 {
		t.Fatalf("devices = %d, shells = %d, want 1 each", devices, shells)
	}
}

func TestV5DisabledMissKeepsDatabaseMessage(t *testing.T) {
	a := New(t.Context(), &protocol.Settings{})
	a.keys = func() (map[string]string, error) {
		return map[string]string{}, nil
	}
	a.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run when device keys are disabled")
		return cmd.CallResult{}, nil
	}
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"missing"}`}, nil
	}
	_, err := a.Decrypt("song.kgg", "unused", nil)
	if err == nil || !strings.Contains(err.Error(), "酷狗数据库中找不到音频密钥 (audioHash: missing)") {
		t.Fatalf("error = %v", err)
	}
}

func TestV5JoinsLocalAndAdbFailures(t *testing.T) {
	a := New(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{AllowAdbKeys: true}})
	a.keys = func() (map[string]string, error) {
		return nil, os.ErrNotExist
	}
	a.adbKeys = func() (map[string]string, error) {
		return nil, os.ErrPermission
	}
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"hash"}`}, nil
	}
	_, err := a.Decrypt("song.kgg", "unused", nil)
	if err == nil || !strings.Contains(err.Error(), os.ErrNotExist.Error()) || !strings.Contains(err.Error(), os.ErrPermission.Error()) {
		t.Fatalf("error = %v", err)
	}
}

func TestV5AdbMissReturnsLocalError(t *testing.T) {
	a := New(t.Context(), &protocol.Settings{Binaries: protocol.BinariesSettings{AllowAdbKeys: true}})
	a.keys = func() (map[string]string, error) {
		return nil, os.ErrNotExist
	}
	a.adbKeys = func() (map[string]string, error) {
		return map[string]string{"other": "key"}, nil
	}
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: `{"cryptoVersion":5,"audioHash":"hash"}`}, nil
	}
	_, err := a.Decrypt("song.kgg", "unused", nil)
	if err == nil || !strings.Contains(err.Error(), os.ErrNotExist.Error()) || strings.Contains(err.Error(), "找不到音频密钥") {
		t.Fatalf("error = %v", err)
	}
}

func mmkvEntry(key, value string) []byte {
	encoded := mmkvString(value)
	record := mmkvString(key)
	record = binary.AppendUvarint(record, uint64(len(encoded)))
	return append(record, encoded...)
}

func mmkvString(s string) []byte {
	b := binary.AppendUvarint(nil, uint64(len(s)))
	return append(b, s...)
}

func mmkvFile(parts ...[]byte) []byte {
	payload := append([]byte{0}, bytes.Join(parts, nil)...)
	buf := make([]byte, 4+len(payload))
	binary.LittleEndian.PutUint32(buf[:4], uint32(len(payload)))
	copy(buf[4:], payload)
	return buf
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

func crlfBase64(data []byte) string {
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
