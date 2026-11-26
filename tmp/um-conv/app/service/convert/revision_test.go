package convert

import (
	"path/filepath"
	"testing"

	"git.um-react.app/um/um-conv/app/settingstore"
)

func TestGetState_IncludesSessionAndSettingsRevisions(t *testing.T) {
	store := settingstore.New(settingstore.Default(), filepath.Join(t.TempDir(), "um-conv.toml"))
	service := &ConvertService{store: store, revision: 1, job: JobState{Status: "idle"}}

	initial := service.GetState()
	if initial.Revision != 1 || initial.SettingsRevision != 1 {
		t.Fatalf("initial revisions = (%d, %d), want (1, 1)", initial.Revision, initial.SettingsRevision)
	}

	if _, err := store.PatchState(map[string]any{"outputDir": "C:/Music"}); err != nil {
		t.Fatal(err)
	}
	state := service.GetState()
	if state.SettingsRevision != 2 {
		t.Fatalf("settings revision = %d, want 2", state.SettingsRevision)
	}
	if state.Settings.OutputDir != "C:/Music" {
		t.Fatalf("outputDir = %q", state.Settings.OutputDir)
	}
}
