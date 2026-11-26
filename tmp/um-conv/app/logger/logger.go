package logger

import (
	"fmt"
	"git.um-react.app/um/um-conv/app/configdir"
	"io"
	"log/slog"
	"os"
	"sync"
)

var (
	mu   sync.Mutex
	file *os.File
)

// Init opens the log file under UserConfigDir/um-conv and sets slog.Default.
func Init() error {
	mu.Lock()
	defer mu.Unlock()

	if file != nil {
		return nil
	}

	path, err := configdir.LogPath()
	if err != nil {
		return err
	}

	f, err := os.OpenFile(path, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0o644)
	if err != nil {
		return fmt.Errorf("open log file: %w", err)
	}

	handler := slog.NewTextHandler(io.MultiWriter(f, os.Stderr), &slog.HandlerOptions{
		Level: slog.LevelInfo,
	})
	slog.SetDefault(slog.New(handler))
	file = f
	return nil
}

// Path returns the active log file path, or the configured log path when uninitialized.
func Path() (string, error) {
	mu.Lock()
	defer mu.Unlock()
	if file != nil {
		return file.Name(), nil
	}
	return configdir.LogPath()
}

// Sync flushes the active log file to disk.
func Sync() error {
	mu.Lock()
	defer mu.Unlock()
	if file == nil {
		return nil
	}
	return file.Sync()
}

// Close closes the log file handle. Safe to call multiple times.
func Close() {
	mu.Lock()
	defer mu.Unlock()
	if file == nil {
		return
	}
	_ = file.Close()
	file = nil
}
