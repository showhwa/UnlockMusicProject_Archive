package kwm

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/binary"
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/adb"
	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
)

func TestParseDeviceKeys(t *testing.T) {
	payload := mmkvFile(
		mmkvStringEntry("app_version", "10.0"),
		mmkvRawEntry("non_string_all_high", []byte{0x80}),
		mmkvRawEntry("non_string_multi_high", []byte{0xff, 0xff, 0xff, 0xff}),
		mmkvStringEntry("sec_ekey#", "ignored"),
		mmkvStringEntry("sec_ekey#38525528-20900kmflac", "old-key"),
		mmkvStringEntry("sec_ekey#352599-20900kmflac", "deleted-key"),
		mmkvStringEntry("sec_ekey#38525528-20900kmflac", "new-key"),
		mmkvStringEntry("sec_ekey#352599-20900kmflac", ""),
	)

	got, err := ParseDeviceKeys(payload)
	if err != nil {
		t.Fatalf("ParseDeviceKeys() error = %v", err)
	}
	want := map[string]string{
		"38525528-20900kmflac": "new-key",
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("ParseDeviceKeys() = %#v, want %#v", got, want)
	}

	if _, err := ParseDeviceKeys(payload[:len(payload)-2]); err == nil {
		t.Fatal("expected error for truncated MMKV payload")
	}
}

func TestV2DisabledDoesNotCallAdb(t *testing.T) {
	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{UmCliRs: "um_cli_rs.exe"},
	})
	a.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run when device keys are disabled")
		return cmd.CallResult{}, nil
	}
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: sampleV2Info}, nil
	}
	_, err := a.Decrypt("song.flac", filepath.Join(t.TempDir(), "out"), nil)
	if err == nil || !strings.Contains(err.Error(), "酷我 v2 加密格式需要允许使用 adb 从设备获取密钥") {
		t.Fatalf("Decrypt() error = %v", err)
	}
}

func TestV2UsesAdbOncePerSession(t *testing.T) {
	if DeviceKeyPath != "/data/data/cn.kuwo.player/files/mmkv/cn.kuwo.player.mmkv.defaultconfig" {
		t.Fatalf("DeviceKeyPath = %q", DeviceKeyPath)
	}

	dir := t.TempDir()
	adbPath := filepath.Join(dir, "adb.exe")
	if err := os.WriteFile(adbPath, []byte("adb"), 0o644); err != nil {
		t.Fatal(err)
	}

	payload := mmkvFile(
		mmkvRawEntry("other_int", []byte{0x80, 0x80}),
		mmkvStringEntry("sec_ekey#38525528-20900kmflac", "ekey-1"),
		mmkvStringEntry("sec_ekey#440615-20900kmflac", "ekey-2"),
	)
	encoded := crlfBase64(gzipBytes(t, payload))
	shellArg := adb.WrapCommand("cat '" + DeviceKeyPath + "'")

	devices, shells := 0, 0
	adbRunner := func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != adbPath {
			t.Fatalf("program = %q, want %q", program, adbPath)
		}
		switch {
		case reflect.DeepEqual(args, []string{"devices"}):
			devices++
			return cmd.CallResult{Stdout: "List of devices attached\nemulator-5554\tdevice\n"}, nil
		case reflect.DeepEqual(args, []string{"-s", "emulator-5554", "shell", shellArg}):
			shells++
			return cmd.CallResult{Stdout: encoded}, nil
		default:
			t.Fatalf("unexpected adb args = %q", args)
			return cmd.CallResult{}, nil
		}
	}

	cliRunner := func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "um_cli_rs.exe" {
			t.Fatalf("program = %q", program)
		}
		src := args[len(args)-1]
		if args[1] == "-I" {
			switch {
			case strings.Contains(src, "first"):
				return cmd.CallResult{Stdout: `{"magic":"yeelion-kuwo-tme","version":2,"resourceId":38525528,"formatName":"20900kmflac"}`}, nil
			case strings.Contains(src, "second"):
				return cmd.CallResult{Stdout: sampleV2Info}, nil
			default:
				return cmd.CallResult{Stdout: `{"magic":"yeelion-kuwo-tme","version":2,"resourceId":999999,"formatName":"20900kmflac"}`}, nil
			}
		}
		wantKey := "ekey-1"
		if strings.Contains(src, "second") {
			wantKey = "ekey-2"
		}
		if !reflect.DeepEqual(args, []string{"kuwo", "--output", args[2], "--ekey", wantKey, "--", src}) {
			t.Fatalf("decrypt args = %q", args)
		}
		return cmd.CallResult{}, os.WriteFile(args[2], []byte("audio"), 0o600)
	}

	settings := &protocol.Settings{
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "um_cli_rs.exe",
			Adb:          adbPath,
			AllowAdbKeys: true,
		},
	}

	batch := New(t.Context(), settings)
	batch.adbRun = adbRunner
	batch.run = cliRunner

	for _, name := range []string{"first.flac", "second.kwm"} {
		dest := filepath.Join(dir, name+".out")
		if result, err := batch.Decrypt(filepath.Join(dir, name), dest, nil); err != nil || result.AudioPath != dest {
			t.Fatalf("Decrypt(%s) = %+v, %v", name, result, err)
		}
	}
	if _, err := batch.Decrypt(filepath.Join(dir, "missing.kwm"), filepath.Join(dir, "missing.out"), nil); err == nil || !strings.Contains(err.Error(), "找不到酷我音频密钥 (999999-20900kmflac)") {
		t.Fatalf("missing key error = %v", err)
	}
	if devices != 1 || shells != 1 {
		t.Fatalf("devices = %d, shells = %d, want 1 each in one session", devices, shells)
	}

	next := New(t.Context(), settings)
	next.adbRun = adbRunner
	next.run = cliRunner
	dest := filepath.Join(dir, "next.out")
	if result, err := next.Decrypt(filepath.Join(dir, "first.flac"), dest, nil); err != nil || result.AudioPath != dest {
		t.Fatalf("next batch Decrypt = %+v, %v", result, err)
	}
	if devices != 2 || shells != 2 {
		t.Fatalf("devices = %d, shells = %d, want 2 each across two sessions", devices, shells)
	}
}

func TestV2AdbFailureCachedAndDecryptError(t *testing.T) {
	dir := t.TempDir()
	adbPath := filepath.Join(dir, "adb.exe")
	if err := os.WriteFile(adbPath, []byte("adb"), 0o644); err != nil {
		t.Fatal(err)
	}

	devices := 0
	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "um_cli_rs.exe",
			Adb:          adbPath,
			AllowAdbKeys: true,
		},
	})
	a.adbRun = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		devices++
		return cmd.CallResult{Stdout: "List of devices attached\n"}, nil
	}
	a.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: sampleV2Info}, nil
	}

	_, firstErr := a.Decrypt("a.kwm", filepath.Join(dir, "a.out"), nil)
	_, secondErr := a.Decrypt("b.kwm", filepath.Join(dir, "b.out"), nil)
	if firstErr == nil || secondErr == nil || !strings.Contains(firstErr.Error(), "没有状态为 device 的 adb 设备") || firstErr.Error() != secondErr.Error() {
		t.Fatalf("errors = (%v, %v)", firstErr, secondErr)
	}
	if devices != 1 {
		t.Fatalf("adb devices calls = %d, want 1", devices)
	}

	secret := "secret-ekey-value"
	b := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "um_cli_rs.exe",
			AllowAdbKeys: true,
		},
	})
	b.adbKeys = func() (map[string]string, error) {
		return map[string]string{"440615-20900kmflac": secret}, nil
	}
	b.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if args[1] == "-I" {
			return cmd.CallResult{Stdout: sampleV2Info}, nil
		}
		return cmd.CallResult{ExitCode: 3, Stderr: "bad ekey"}, nil
	}
	_, err := b.Decrypt("song.kwm", filepath.Join(dir, "out"), nil)
	if err == nil || !strings.Contains(err.Error(), "酷我音频解密失败") || !strings.Contains(err.Error(), "bad ekey") {
		t.Fatalf("error = %v", err)
	}

	ctx, cancel := context.WithCancel(t.Context())
	defer cancel()
	c := New(ctx, &protocol.Settings{
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "um_cli_rs.exe",
			Adb:          adbPath,
			AllowAdbKeys: true,
		},
	})
	c.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		cancel()
		return cmd.CallResult{ExitCode: 1}, context.Canceled
	}
	c.run = func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{Stdout: sampleV2Info}, nil
	}
	_, err = c.Decrypt("song.kwm", filepath.Join(dir, "cancel.out"), nil)
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Decrypt error = %v, want context.Canceled", err)
	}
}

func TestV1SkipsAdb(t *testing.T) {
	dir := t.TempDir()
	dest := filepath.Join(dir, "out")
	a := New(t.Context(), &protocol.Settings{
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "um_cli_rs.exe",
			AllowAdbKeys: true,
		},
	})
	a.adbRun = func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb should not run for v1 files")
		return cmd.CallResult{}, nil
	}
	a.run = func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if args[1] == "-I" {
			return cmd.CallResult{Stdout: sampleV1Info}, nil
		}
		return cmd.CallResult{}, os.WriteFile(dest, []byte("flac"), 0o600)
	}
	res, err := a.Decrypt("v1.kwm", dest, nil)
	if err != nil || res.AudioPath != dest {
		t.Fatalf("Decrypt = %+v, %v", res, err)
	}
}

func mmkvStringEntry(key, value string) []byte {
	return mmkvRawEntry(key, mmkvString(value))
}

func mmkvRawEntry(key string, container []byte) []byte {
	record := mmkvString(key)
	record = binary.AppendUvarint(record, uint64(len(container)))
	return append(record, container...)
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
