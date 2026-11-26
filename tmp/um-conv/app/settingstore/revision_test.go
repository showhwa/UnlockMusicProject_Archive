package settingstore

import (
	"path/filepath"
	"testing"
)

func TestPatchState_ReturnsCommittedRevisionAndKeepsFailuresStable(t *testing.T) {
	st := New(Default(), filepath.Join(t.TempDir(), "um-conv.toml"))
	initial := st.SnapshotState()
	if initial.Revision != 1 {
		t.Fatalf("initial revision = %d, want 1", initial.Revision)
	}

	next, err := st.PatchState(map[string]any{"outputDir": "  C:/Music  "})
	if err != nil {
		t.Fatal(err)
	}
	if next.Revision != 2 {
		t.Fatalf("revision = %d, want 2", next.Revision)
	}
	if next.Settings.OutputDir != "C:/Music" {
		t.Fatalf("outputDir = %q, want normalized value", next.Settings.OutputDir)
	}

	if _, err := st.PatchState(map[string]any{"outputTarget": "invalid"}); err == nil {
		t.Fatal("expected invalid patch to fail")
	}
	if got := st.SnapshotState().Revision; got != 2 {
		t.Fatalf("revision after failed patch = %d, want 2", got)
	}
}
