package adb

import (
	"reflect"
	"testing"
)

func TestParseDevicesKeepsOnlineOnly(t *testing.T) {
	const sample = "List of devices attached\r\n" +
		"emulator-5554\tdevice\r\n" +
		"ABC\toffline\r\n" +
		"DEF\tunauthorized\r\n" +
		"\r\n" +
		"0123\tdevice product:x model:y\r\n"
	got := parseDevices(sample)
	want := []string{"emulator-5554", "0123"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("devices = %#v, want %#v", got, want)
	}
}
