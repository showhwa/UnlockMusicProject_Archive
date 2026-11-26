package settingstore

import (
	"path/filepath"
	"testing"
	"time"
)

func TestChanges_CoalescesBurst(t *testing.T) {
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	st := New(Default(), path)

	// Drain any accidental signal (New does not notify).
	select {
	case <-st.Changes():
		t.Fatal("unexpected signal on New")
	default:
	}

	patches := []map[string]any{
		{"outputFormat": "flac"},
		{"outputFormat": "wav"},
		{"outputFormat": "ogg"},
		{"outputFormat": "aac"},
		{"outputFormat": "mp3_cbr"},
	}
	for _, p := range patches {
		if err := st.Patch(p); err != nil {
			t.Fatal(err)
		}
	}

	// Buffer-1: at most one pending signal after the burst.
	pending := 0
drain:
	for {
		select {
		case <-st.Changes():
			pending++
			if pending > 1 {
				t.Fatalf("expected at most 1 coalesced signal, got %d", pending)
			}
		case <-time.After(20 * time.Millisecond):
			break drain
		}
	}
	if pending != 1 {
		t.Fatalf("expected exactly 1 pending signal after burst, got %d", pending)
	}
}
