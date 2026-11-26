package adb

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/cmd"
)

func TestWrapCommandEcho(t *testing.T) {
	const want = `su -c "$(echo "ZWNobyAx" | base64 -d) | gzip | base64"`
	if got := WrapCommand("echo 1"); got != want {
		t.Fatalf("WrapCommand = %q, want %q", got, want)
	}
}

func TestWrapCommandIsolatesShellMetacharacters(t *testing.T) {
	command := "cat \"a b\" '$HOME' `id`\n; echo \\"
	got := WrapCommand(command)
	for _, special := range []string{"$HOME", "`", "\n"} {
		if strings.Contains(got, special) {
			t.Fatalf("WrapCommand leaks %q: %q", special, got)
		}
	}
	const prefix = `su -c "$(echo "`
	const suffix = `" | base64 -d) | gzip | base64"`
	if !strings.HasPrefix(got, prefix) || !strings.HasSuffix(got, suffix) {
		t.Fatalf("unexpected wrapper: %q", got)
	}
	payload := strings.TrimSuffix(strings.TrimPrefix(got, prefix), suffix)
	decoded, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		t.Fatal(err)
	}
	if string(decoded) != command {
		t.Fatalf("decoded = %q, want %q", decoded, command)
	}
	if strings.ContainsAny(payload, "\"'`$\\ \n") {
		t.Fatalf("payload contains shell-special characters: %q", payload)
	}
}

func TestDecodeStdoutCRLF(t *testing.T) {
	raw := []byte("hello 密钥")
	got, err := DecodeStdout(crlfBase64(t, gzipBytes(t, raw)))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, raw) {
		t.Fatalf("decoded = %q, want %q", got, raw)
	}
}

func TestDecodeStdoutEmpty(t *testing.T) {
	if _, err := DecodeStdout(" \r\n\t"); err == nil {
		t.Fatal("expected empty stdout error")
	}
}

func TestReadFileAsRootCatsQuotedPath(t *testing.T) {
	c := Client{Path: "adb", Run: func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		want := []string{"-s", "serial1", "shell", WrapCommand("cat '/data/a b'")}
		if program != "adb" || !reflect.DeepEqual(args, want) {
			t.Fatalf("command = %s %q", program, args)
		}
		return cmd.CallResult{Stdout: base64.StdEncoding.EncodeToString(gzipBytes(t, []byte("body")))}, nil
	}}
	got, err := c.ReadFileAsRoot(context.Background(), "serial1", "/data/a b")
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "body" {
		t.Fatalf("body = %q", got)
	}
}

func TestReadFileAsRootRejectsEmptyPath(t *testing.T) {
	c := Client{Run: func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb was executed")
		return cmd.CallResult{}, nil
	}}
	if _, err := c.ReadFileAsRoot(context.Background(), "serial1", "  "); err == nil {
		t.Fatal("expected empty path error")
	}
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
	b.WriteString("\r\n")
	for i := 0; i < len(encoded); i += 8 {
		end := i + 8
		if end > len(encoded) {
			end = len(encoded)
		}
		if i > 0 {
			b.WriteString("\r\n")
		}
		b.WriteString(encoded[i:end])
	}
	b.WriteString("\t ")
	return b.String()
}
