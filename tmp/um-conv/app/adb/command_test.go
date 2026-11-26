package adb

import (
	"context"
	"encoding/base64"
	"reflect"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/cmd"
)

func TestRunCommandPassesCommandUnchanged(t *testing.T) {
	c := Client{Path: "adb", Run: func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		want := []string{"-s", "serial1", "shell", "echo 1"}
		if program != "adb" || !reflect.DeepEqual(args, want) {
			t.Fatalf("command = %s %q", program, args)
		}
		return cmd.CallResult{Stdout: "ok"}, nil
	}}
	got, err := c.RunCommand(context.Background(), "serial1", "echo 1")
	if err != nil {
		t.Fatal(err)
	}
	if got != "ok" {
		t.Fatalf("stdout = %q", got)
	}
}

func TestShellWithoutDeviceOmitsSerial(t *testing.T) {
	c := Client{Path: "adb", Run: func(_ context.Context, _ string, args []string) (cmd.CallResult, error) {
		if !reflect.DeepEqual(args, []string{"shell", "echo 1"}) {
			t.Fatalf("args = %q", args)
		}
		return cmd.CallResult{Stdout: "1"}, nil
	}}
	if _, err := c.RunCommand(context.Background(), "", "echo 1"); err != nil {
		t.Fatal(err)
	}
}

func TestShellRejectsInvalidDeviceWithoutRunning(t *testing.T) {
	c := Client{Run: func(context.Context, string, []string) (cmd.CallResult, error) {
		t.Fatal("adb was executed")
		return cmd.CallResult{}, nil
	}}
	if _, err := c.RunCommand(context.Background(), "bad id", "echo 1"); err == nil {
		t.Fatal("expected invalid device error")
	}
}

func TestShellNonZeroDoesNotDecode(t *testing.T) {
	encoded := base64.StdEncoding.EncodeToString(gzipBytes(t, []byte("secret-ekey")))
	c := Client{Run: func(context.Context, string, []string) (cmd.CallResult, error) {
		return cmd.CallResult{ExitCode: 1, Stdout: encoded, Stderr: "permission denied"}, nil
	}}
	got, err := c.RunCommand(context.Background(), "serial1", "echo 1")
	if err == nil || !strings.Contains(err.Error(), "permission denied") {
		t.Fatalf("error = %v", err)
	}
	if got != "" || strings.Contains(err.Error(), "secret-ekey") {
		t.Fatalf("decoded failure payload: %q, %v", got, err)
	}
}
