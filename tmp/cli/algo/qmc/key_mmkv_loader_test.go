package qmc

import (
	"strings"
	"testing"

	"go.uber.org/zap"
)

func TestParseQmpcMMKVCliOutput(t *testing.T) {
	logger := zap.NewNop()

	t.Run("pairs", func(t *testing.T) {
		in := "file1.mflac\nkey1\nfile2.mgg\nkey2\n"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if len(got) != 2 {
			t.Fatalf("len = %d, want 2", len(got))
		}
		if got["file1.mflac"] != "key1" {
			t.Errorf("file1.mflac = %q, want key1", got["file1.mflac"])
		}
		if got["file2.mgg"] != "key2" {
			t.Errorf("file2.mgg = %q, want key2", got["file2.mgg"])
		}
	})

	t.Run("crlf", func(t *testing.T) {
		in := "a.mflac\r\nKEYA\r\nb.mflac\r\nKEYB\r\n"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if got["a.mflac"] != "KEYA" || got["b.mflac"] != "KEYB" {
			t.Errorf("got %#v", got)
		}
	})

	t.Run("odd line ignored", func(t *testing.T) {
		in := "file1.mflac\nkey1\norphan\n"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if len(got) != 1 || got["file1.mflac"] != "key1" {
			t.Errorf("got %#v, want single pair", got)
		}
	})

	t.Run("empty name skipped", func(t *testing.T) {
		in := "\nkey-for-empty\nfile.mflac\nrealkey\n"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if len(got) != 1 || got["file.mflac"] != "realkey" {
			t.Errorf("got %#v", got)
		}
		if _, ok := got[""]; ok {
			t.Error("empty name should not be stored")
		}
	})

	t.Run("empty key skipped", func(t *testing.T) {
		in := "empty-key.mflac\n\nfile.mflac\nrealkey\n"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if len(got) != 1 || got["file.mflac"] != "realkey" {
			t.Errorf("got %#v", got)
		}
		if _, ok := got["empty-key.mflac"]; ok {
			t.Error("empty key should not be stored")
		}
	})

	t.Run("empty input", func(t *testing.T) {
		got := parseQmpcMMKVCliOutput(strings.NewReader(""), logger)
		if len(got) != 0 {
			t.Errorf("got %#v, want empty", got)
		}
	})

	t.Run("no trailing newline", func(t *testing.T) {
		in := "file.mflac\nkey"
		got := parseQmpcMMKVCliOutput(strings.NewReader(in), logger)
		if got["file.mflac"] != "key" {
			t.Errorf("got %#v", got)
		}
	})
}
