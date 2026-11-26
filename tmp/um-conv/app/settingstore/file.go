package settingstore

import (
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"git.um-react.app/um/um-conv/app/protocol"

	"github.com/pelletier/go-toml/v2"
)

// LoadFile reads settings from path. Missing file or unreadable/corrupt content
// returns Default() (after Repair when partial decode succeeds).
func LoadFile(path string, knownFormats map[string]struct{}) protocol.Settings {
	defaults := Default()
	data, err := os.ReadFile(path)
	if err != nil {
		if !os.IsNotExist(err) {
			slog.Warn("settings: read failed, using defaults", "path", path, "err", err)
		}
		return defaults
	}

	s := defaults
	// Read the legacy key when the new key is absent. An explicitly empty
	// new value still takes precedence and enables executable discovery.
	input := struct {
		*protocol.Settings
		Binaries struct {
			protocol.BinariesSettings
			UmCliRs    *string `toml:"um_cli_rs"`
			LegacyPath string  `toml:"um_cli"`
		} `toml:"bin"`
	}{Settings: &s}
	input.Binaries.BinariesSettings = s.Binaries
	if err := toml.Unmarshal(data, &input); err != nil {
		slog.Warn("settings: parse failed, using defaults", "path", path, "err", err)
		return defaults
	}
	s.Binaries = input.Binaries.BinariesSettings
	if input.Binaries.UmCliRs != nil {
		s.Binaries.UmCliRs = *input.Binaries.UmCliRs
	} else {
		s.Binaries.UmCliRs = input.Binaries.LegacyPath
	}
	protocol.RepairSettings(&s, defaults, knownFormats)
	return s
}

func saveSettings(path string, s protocol.Settings) error {
	if path == "" {
		return fmt.Errorf("settings persist path is empty")
	}
	data, err := toml.Marshal(s)
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("mkdir settings dir: %w", err)
	}
	tmp, err := os.CreateTemp(dir, "um-conv-*.toml.tmp")
	if err != nil {
		return fmt.Errorf("create temp settings: %w", err)
	}
	tmpName := tmp.Name()
	ok := false
	defer func() {
		if !ok {
			_ = os.Remove(tmpName)
		}
	}()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("write temp settings: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp settings: %w", err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		return fmt.Errorf("rename settings: %w", err)
	}
	ok = true
	return nil
}
