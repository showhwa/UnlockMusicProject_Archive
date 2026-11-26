package cmd

import (
	"path/filepath"
	"testing"
)

func TestCallCommandStartFailureDoesNotPanic(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "no-such-program")
	result, err := CallCommand(missing, nil)
	if err == nil {
		t.Fatal("expected start error")
	}
	if result.ExitCode != -1 {
		t.Fatalf("ExitCode = %d, want -1", result.ExitCode)
	}
}
