package adb

import (
	"context"
	"reflect"
	"testing"

	"git.um-react.app/um/um-conv/app/cmd"
)

func TestDevicesCommandIsHostText(t *testing.T) {
	const sample = "List of devices attached\n" +
		"emulator-5554\tdevice\n" +
		"ABC\toffline\n" +
		"DEF\tunauthorized\n" +
		"0123\tdevice\n"
	c := Client{Path: "adb-bin", Run: func(_ context.Context, program string, args []string) (cmd.CallResult, error) {
		if program != "adb-bin" || !reflect.DeepEqual(args, []string{"devices"}) {
			t.Fatalf("command = %s %q", program, args)
		}
		return cmd.CallResult{Stdout: sample}, nil
	}}
	got, err := c.Devices(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	want := []string{"emulator-5554", "0123"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("devices = %#v, want %#v", got, want)
	}
}
