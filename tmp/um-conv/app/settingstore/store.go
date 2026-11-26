package settingstore

import (
	"fmt"
	"log/slog"
	"os"
	"sync"

	"git.um-react.app/um/um-conv/app/protocol"
)

// Store holds application settings, output profiles, and a change signal channel.
type Store struct {
	mu sync.Mutex

	settings    protocol.Settings
	revision    uint64
	profiles    []protocol.OutputProfile
	formatIDs   map[string]struct{}
	persistPath string
	changed     chan struct{}
}

// Default returns in-memory default settings.
func Default() protocol.Settings {
	return protocol.Settings{
		OutputFormat: "mp3_cbr",
		AudioQuality: protocol.AudioQualityHigh,
		Binaries: protocol.BinariesSettings{
			UmCliRs:      "",
			QmpcMmkvCli:  "",
			Adb:          "",
			AllowAdbKeys: false,
		},
		OutputTarget:             protocol.OutputTargetSource,
		OutputDir:                "",
		TempDir:                  "",
		DeleteSourceAfterConvert: false,
		ExistingOutputMode:       protocol.ExistingOutputSkip,
		EnableParallel:           true,
		Parallel:                 0,
		FFmpeg: protocol.FFmpegSettings{
			Path:          "",
			AACEncoder:    protocol.AACEncoderAuto,
			AACFdkWithVBR: true,
			OGGEncoder:    protocol.OGGEncoderAuto,
		},
	}
}

// KnownFormatIDs returns the static output profile ID set (for LoadFile).
func KnownFormatIDs() map[string]struct{} {
	formatIDs := make(map[string]struct{}, len(outputProfiles))
	for _, p := range outputProfiles {
		formatIDs[p.ID] = struct{}{}
	}
	return formatIDs
}

// New creates a Store from initial settings and a persist path.
func New(initial protocol.Settings, persistPath string) *Store {
	formatIDs := KnownFormatIDs()
	defaults := Default()
	protocol.RepairSettings(&initial, defaults, formatIDs)
	prepared, err := prepareSettings(initial, formatIDs)
	if err != nil {
		prepared = defaults
		slog.Error("prepareSettings failed, fallback to defaults", "error", err)
	}
	return &Store{
		settings:    prepared,
		revision:    1,
		profiles:    outputProfiles,
		formatIDs:   formatIDs,
		persistPath: persistPath,
		changed:     make(chan struct{}, 1),
	}
}

// Changes returns a receive-only signal channel (buffer 1, coalesced).
func (s *Store) Changes() <-chan struct{} {
	return s.changed
}

func (s *Store) notifyChanged() {
	select {
	case s.changed <- struct{}{}:
	default:
	}
}

// Snapshot returns a copy of the current settings.
func (s *Store) Snapshot() protocol.Settings {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.settings
}

// SnapshotState returns settings and their revision under the same lock.
func (s *Store) SnapshotState() protocol.SettingsState {
	s.mu.Lock()
	defer s.mu.Unlock()
	return protocol.SettingsState{Revision: s.revision, Settings: s.settings}
}

// Profiles returns the output format catalog (immutable after init).
func (s *Store) Profiles() []protocol.OutputProfile {
	return s.profiles
}

// EnsureConfigFile returns the configured persist path, creating the file from
// current settings if missing without bumping revision or signaling changes.
func (s *Store) EnsureConfigFile() (string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.persistPath == "" {
		return "", fmt.Errorf("settings persist path is empty")
	}

	fi, err := os.Stat(s.persistPath)
	if err == nil {
		if fi.IsDir() {
			return "", fmt.Errorf("settings persist path %q is a directory", s.persistPath)
		}
		return s.persistPath, nil
	}
	if !os.IsNotExist(err) {
		return "", fmt.Errorf("stat settings persist path: %w", err)
	}

	if err := saveSettings(s.persistPath, s.settings); err != nil {
		return "", err
	}
	return s.persistPath, nil
}

// commit persists next then updates memory. Caller must hold s.mu.
func (s *Store) commit(next protocol.Settings) error {
	if err := saveSettings(s.persistPath, next); err != nil {
		return err
	}
	s.settings = next
	s.revision++
	return nil
}

// Save validates, persists, and signals change.
func (s *Store) Save(next protocol.Settings) error {
	s.mu.Lock()
	prepared, err := prepareSettings(next, s.formatIDs)
	if err != nil {
		s.mu.Unlock()
		return err
	}
	if err := s.commit(prepared); err != nil {
		s.mu.Unlock()
		return err
	}
	s.mu.Unlock()
	s.notifyChanged()
	return nil
}

// Patch applies an RFC 7396 JSON Merge Patch, persists, and signals change.
func (s *Store) Patch(patch map[string]any) error {
	_, err := s.PatchState(patch)
	return err
}

// PatchState applies a merge patch and returns the committed authoritative state.
func (s *Store) PatchState(patch map[string]any) (protocol.SettingsState, error) {
	s.mu.Lock()
	next, err := mergeSettingsPatch(s.settings, patch, s.formatIDs)
	if err != nil {
		s.mu.Unlock()
		return protocol.SettingsState{}, err
	}
	if err := s.commit(next); err != nil {
		s.mu.Unlock()
		return protocol.SettingsState{}, err
	}
	state := protocol.SettingsState{Revision: s.revision, Settings: s.settings}
	s.mu.Unlock()
	s.notifyChanged()
	return state, nil
}
