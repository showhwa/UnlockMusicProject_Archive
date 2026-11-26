package avconv

import "testing"

func TestParseDurationSeconds(t *testing.T) {
	sec, ok := parseDurationSeconds("  Duration: 00:03:45.67, start: 0.000000")
	if !ok {
		t.Fatal("expected ok")
	}
	if sec < 225.6 || sec > 225.7 {
		t.Fatalf("sec=%v", sec)
	}
	if _, ok := parseDurationSeconds("no duration here"); ok {
		t.Fatal("expected not ok")
	}
}
