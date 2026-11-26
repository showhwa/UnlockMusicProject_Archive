package configdir

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	appDirName       = "um-conv"
	settingsFileName = "um-conv.toml"
	logFileName      = "um-conv.log"
)

// Dir returns UserConfigDir/um-conv, creating it if needed.
func Dir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("user config dir: %w", err)
	}
	dir := filepath.Join(configDir, appDirName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("mkdir config dir: %w", err)
	}
	return dir, nil
}

// UserSettingsPath returns UserConfigDir/um-conv/um-conv.toml (dir is created).
func UserSettingsPath() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, settingsFileName), nil
}

// LogPath returns UserConfigDir/um-conv/um-conv.log (dir is created).
func LogPath() (string, error) {
	dir, err := Dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, logFileName), nil
}

// ResolveSettingsPath picks the settings file path.
// If <exeDir>/um-conv.toml exists, that path is used; if it exists but cannot be
// opened for reading, a fatal-level error is returned (no fallback).
// Otherwise returns UserConfigDir/um-conv/um-conv.toml.
func ResolveSettingsPath() (string, error) {
	return resolveSettingsPath(os.Executable, os.Stat, os.Open)
}

type (
	executableFunc func() (string, error)
	statFunc       func(name string) (os.FileInfo, error)
	openFunc       func(name string) (*os.File, error)
)

func resolveSettingsPath(executable executableFunc, stat statFunc, open openFunc) (string, error) {
	exe, err := executable()
	if err != nil {
		return "", fmt.Errorf("resolve executable: %w", err)
	}
	portable := filepath.Join(filepath.Dir(exe), settingsFileName)

	fi, err := stat(portable)
	if err == nil && !fi.IsDir() {
		f, openErr := open(portable)
		if openErr != nil {
			return "", fmt.Errorf("portable settings %q exists but cannot be read: %w", portable, openErr)
		}
		_ = f.Close()
		return portable, nil
	}
	if err != nil && !os.IsNotExist(err) {
		return "", fmt.Errorf("stat portable settings %q: %w", portable, err)
	}

	return UserSettingsPath()
}
