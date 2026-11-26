package cmd

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestCallResult_ErrorIncludesStdoutStderr(t *testing.T) {
	r := CallResult{Stdout: " out ", Stderr: " err ", ExitCode: 2}
	err := r.Error("umc_rs: failed", errors.New("exit status 2"))
	msg := err.Error()
	for _, want := range []string{"exit=2", "stdout: out", "stderr: err", "exit status 2"} {
		if !strings.Contains(msg, want) {
			t.Fatalf("missing %q in %q", want, msg)
		}
	}
}

func TestCallResult_ErrorWrapsRunError(t *testing.T) {
	runErr := context.Canceled
	err := CallResult{Stdout: "out", Stderr: "err", ExitCode: 1}.Error("failed", runErr)
	if !errors.Is(err, runErr) {
		t.Fatalf("errors.Is(%v, %v) = false", err, runErr)
	}
	want := "failed: context canceled (exit=1)\nstdout: out\nstderr: err"
	if err.Error() != want {
		t.Fatalf("message = %q, want %q", err.Error(), want)
	}
}

func TestCallResult_ErrorWithoutRunError(t *testing.T) {
	err := CallResult{ExitCode: 3}.Error("failed", nil)
	want := "failed (exit=3): command failed with no output"
	if err.Error() != want {
		t.Fatalf("message = %q, want %q", err.Error(), want)
	}
}

func TestCallResult_Failed(t *testing.T) {
	if (CallResult{ExitCode: 0}).Failed(nil) {
		t.Fatal("success should not be failed")
	}
	if !(CallResult{ExitCode: 2}).Failed(nil) {
		t.Fatal("nonzero exit should be failed")
	}
	if !(CallResult{}).Failed(errors.New("x")) {
		t.Fatal("run err should be failed")
	}
}
