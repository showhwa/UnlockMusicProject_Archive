package settings

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"slices"
	"strings"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"
)

func newTestService(t *testing.T) *SettingsService {
	t.Helper()
	path := filepath.Join(t.TempDir(), "um-conv.toml")
	return NewSettingsService(settingstore.New(settingstore.Default(), path))
}

func TestGetSettingsReturnsDefaults(t *testing.T) {
	svc := newTestService(t)
	state := svc.GetSettings()
	if state.Settings != settingstore.Default() {
		t.Fatalf("settings = %+v, want defaults", state.Settings)
	}
}

func TestGetOutputProfilesNotEmpty(t *testing.T) {
	if len(newTestService(t).GetOutputProfiles()) == 0 {
		t.Fatal("expected output profiles")
	}
}

func TestSaveSettingsPersistsAndBumpsRevision(t *testing.T) {
	svc := newTestService(t)
	before := svc.GetSettings()

	next := before.Settings
	next.DeleteSourceAfterConvert = !next.DeleteSourceAfterConvert
	if err := svc.SaveSettings(next); err != nil {
		t.Fatal(err)
	}

	after := svc.GetSettings()
	if after.Settings.DeleteSourceAfterConvert != next.DeleteSourceAfterConvert {
		t.Fatalf("deleteSourceAfterConvert not saved: %+v", after.Settings)
	}
	if after.Revision <= before.Revision {
		t.Fatalf("revision %d did not advance past %d", after.Revision, before.Revision)
	}
}

func TestSaveSettingsRejectsInvalid(t *testing.T) {
	svc := newTestService(t)
	before := svc.GetSettings()

	bad := before.Settings
	bad.OutputTarget = protocol.OutputTarget("bogus")
	if err := svc.SaveSettings(bad); err == nil {
		t.Fatal("expected validation error")
	}

	after := svc.GetSettings()
	if after != before {
		t.Fatalf("state changed after rejected save: %+v -> %+v", before, after)
	}
}

func TestPatchSettingsMergesAndRejectsInvalid(t *testing.T) {
	svc := newTestService(t)
	before := svc.GetSettings()

	state, err := svc.PatchSettings(map[string]any{"deleteSourceAfterConvert": !before.Settings.DeleteSourceAfterConvert})
	if err != nil {
		t.Fatal(err)
	}
	if state.Settings.DeleteSourceAfterConvert == before.Settings.DeleteSourceAfterConvert {
		t.Fatal("patch was not applied")
	}
	if state.Settings.OutputFormat != before.Settings.OutputFormat {
		t.Fatal("patch changed unrelated fields")
	}
	if state.Revision <= before.Revision {
		t.Fatalf("revision %d did not advance past %d", state.Revision, before.Revision)
	}

	if _, err := svc.PatchSettings(map[string]any{"audioQuality": 99}); err == nil {
		t.Fatal("expected validation error for invalid patch")
	}
	if got := svc.GetSettings(); got != state {
		t.Fatalf("state changed after rejected patch: %+v -> %+v", state, got)
	}
}

func writeFakeProbeTool(t *testing.T, dir, baseName, winBody, unixBody string) string {
	t.Helper()
	if runtime.GOOS == "windows" {
		path := filepath.Join(dir, baseName+".cmd")
		if err := os.WriteFile(path, []byte("@echo off\r\n"+winBody+"\r\n"), 0o755); err != nil {
			t.Fatal(err)
		}
		return path
	}
	path := filepath.Join(dir, baseName)
	if err := os.WriteFile(path, []byte("#!/bin/sh\n"+unixBody+"\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	return path
}

func TestProbeExecutableSuccess(t *testing.T) {
	svc := newTestService(t)
	dir := t.TempDir()

	ffmpeg := writeFakeProbeTool(t, dir, "fake-ffmpeg",
		`if "%1"=="-hide_banner" if "%3"=="-version" (echo ffmpeg version 7.1.1 Copyright & exit /b 0)
if "%1"=="-hide_banner" if "%3"=="-encoders" (echo  A..... aac                  AAC & echo  A..... libmp3lame           MP3 & exit /b 0)
exit /b 1`,
		`case "$3" in
  -version) echo "ffmpeg version 7.1.1 Copyright" ;;
  -encoders) printf " A..... aac                  AAC\n A..... libmp3lame           MP3\n" ;;
  *) exit 1 ;;
esac`,
	)
	ffRes := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "ffmpeg", Path: ffmpeg})
	if !ffRes.OK || ffRes.Version != "7.1.1" || ffRes.Path != ffmpeg {
		t.Fatalf("ffmpeg probe = %+v", ffRes)
	}
	if !slices.Equal(ffRes.Encoders, []string{"aac", "libmp3lame"}) {
		t.Fatalf("ffmpeg encoders = %v, want [aac libmp3lame]", ffRes.Encoders)
	}

	umCliRs := writeFakeProbeTool(t, dir, "fake-um",
		`if "%1"=="-V" (echo um_cli_rs 0.5.2 & exit /b 0)
exit /b 1`,
		`[ "$1" = "-V" ] && echo "um_cli_rs 0.5.2" || exit 1`,
	)
	umRes := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "um_cli_rs", Path: umCliRs})
	if !umRes.OK || umRes.Version != "um_cli_rs 0.5.2" || umRes.Path != umCliRs || umRes.Error != "" {
		t.Fatalf("um_cli_rs probe = %+v", umRes)
	}

	adb := writeFakeProbeTool(t, dir, "fake-adb",
		`if "%1"=="version" (echo Android Debug Bridge version 1.0.41 & exit /b 0)
exit /b 1`,
		`[ "$1" = "version" ] && echo "Android Debug Bridge version 1.0.41" || exit 1`,
	)
	adbRes := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "adb", Path: adb})
	if !adbRes.OK || adbRes.Version != "Android Debug Bridge version 1.0.41" || adbRes.Path != adb {
		t.Fatalf("adb probe = %+v", adbRes)
	}
}

func TestProbeExecutableErrors(t *testing.T) {
	svc := newTestService(t)
	dir := t.TempDir()

	unknown := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "unknown-tool"})
	if unknown.OK || !strings.Contains(unknown.Error, "未知可执行文件类型") {
		t.Fatalf("unknown exe probe = %+v", unknown)
	}

	missingAbs := filepath.Join(dir, "missing-ffmpeg.exe")
	missing := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "ffmpeg", Path: missingAbs})
	if missing.OK || missing.Error == "" || missing.Path != "" {
		t.Fatalf("missing abs path probe = %+v", missing)
	}

	rel := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "um_cli_rs", Path: filepath.Join("bin", "um_cli_rs")})
	if rel.OK || !strings.Contains(rel.Error, "绝对路径") {
		t.Fatalf("relative path probe = %+v", rel)
	}

	failingAdb := writeFakeProbeTool(t, dir, "bad-adb",
		`echo some stderr 1>&2
exit /b 2`,
		`echo "some stderr" >&2
exit 2`,
	)
	badRes := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "adb", Path: failingAdb})
	if badRes.OK || badRes.Path != failingAdb || !strings.Contains(badRes.Error, "rc=2") || !strings.Contains(badRes.Error, "some stderr") {
		t.Fatalf("failing adb probe = %+v", badRes)
	}

	badVersionUm := writeFakeProbeTool(t, dir, "empty-um",
		`exit /b 0`,
		`exit 0`,
	)
	emptyVerRes := svc.ProbeExecutable(protocol.ProbeRequest{Exe: "qmpc-mmkv-cli", Path: badVersionUm})
	if emptyVerRes.OK || emptyVerRes.Path != badVersionUm || !strings.Contains(emptyVerRes.Error, "无法解析") {
		t.Fatalf("empty version probe = %+v", emptyVerRes)
	}
}

func TestOpenLogFile(t *testing.T) {
	t.Run("syncs and opens existing log file", func(t *testing.T) {
		svc := newTestService(t)
		logFile := filepath.Join(t.TempDir(), "um-conv.log")
		if err := os.WriteFile(logFile, []byte("hello\n"), 0o644); err != nil {
			t.Fatal(err)
		}

		var order []string
		var opened string
		svc.syncLogger = func() error {
			order = append(order, "sync")
			return nil
		}
		svc.logPath = func() (string, error) {
			order = append(order, "path")
			return logFile, nil
		}
		svc.openFile = func(p string) error {
			order = append(order, "open")
			opened = p
			return nil
		}

		if err := svc.OpenLogFile(); err != nil {
			t.Fatalf("OpenLogFile() error = %v", err)
		}
		if opened != logFile {
			t.Fatalf("opened = %q, want %q", opened, logFile)
		}
		if !slices.Equal(order, []string{"sync", "path", "open"}) {
			t.Fatalf("call order = %v, want [sync path open]", order)
		}
	})

	t.Run("errors when log file missing", func(t *testing.T) {
		svc := newTestService(t)
		missing := filepath.Join(t.TempDir(), "missing.log")
		openCalled := false
		svc.syncLogger = func() error { return nil }
		svc.logPath = func() (string, error) { return missing, nil }
		svc.openFile = func(string) error {
			openCalled = true
			return nil
		}

		err := svc.OpenLogFile()
		if err == nil || !strings.Contains(err.Error(), "日志文件不存在") {
			t.Fatalf("got err = %v, want missing log error", err)
		}
		if openCalled {
			t.Fatal("openFile should not be called when log file is missing")
		}
	})

	t.Run("errors when log path is directory", func(t *testing.T) {
		svc := newTestService(t)
		dir := t.TempDir()
		svc.syncLogger = func() error { return nil }
		svc.logPath = func() (string, error) { return dir, nil }
		svc.openFile = func(string) error {
			t.Fatal("openFile should not be called for directory")
			return nil
		}

		err := svc.OpenLogFile()
		if err == nil || !strings.Contains(err.Error(), "日志路径是目录") {
			t.Fatalf("got err = %v, want directory error", err)
		}
	})

	t.Run("errors when logPath fails", func(t *testing.T) {
		svc := newTestService(t)
		svc.syncLogger = func() error { return nil }
		svc.logPath = func() (string, error) { return "", errors.New("boom") }
		svc.openFile = func(string) error {
			t.Fatal("openFile should not be called when logPath fails")
			return nil
		}

		err := svc.OpenLogFile()
		if err == nil || !strings.Contains(err.Error(), "获取日志文件路径失败") {
			t.Fatalf("got err = %v, want logPath error", err)
		}
	})

	t.Run("errors when openFile fails", func(t *testing.T) {
		svc := newTestService(t)
		logFile := filepath.Join(t.TempDir(), "um-conv.log")
		if err := os.WriteFile(logFile, []byte("hello\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		svc.syncLogger = func() error { return nil }
		svc.logPath = func() (string, error) { return logFile, nil }
		svc.openFile = func(string) error { return errors.New("no viewer") }

		err := svc.OpenLogFile()
		if err == nil || !strings.Contains(err.Error(), "无法打开日志文件") {
			t.Fatalf("got err = %v, want openFile error", err)
		}
	})
}

func TestOpenConfigFile(t *testing.T) {
	t.Run("creates missing config file including portable path and opens it", func(t *testing.T) {
		portablePath := filepath.Join(t.TempDir(), "portable", "um-conv.toml")
		svc := NewSettingsService(settingstore.New(settingstore.Default(), portablePath))
		var opened string
		svc.openFile = func(p string) error {
			opened = p
			return nil
		}

		if err := svc.OpenConfigFile(); err != nil {
			t.Fatalf("OpenConfigFile() error = %v", err)
		}
		if opened != portablePath {
			t.Fatalf("opened = %q, want %q", opened, portablePath)
		}
		if _, err := os.Stat(portablePath); err != nil {
			t.Fatalf("expected config file to be created: %v", err)
		}
	})

	t.Run("preserves existing config file content", func(t *testing.T) {
		cfgPath := filepath.Join(t.TempDir(), "um-conv.toml")
		custom := "# portable config\noutput_format = 'mp3_cbr'\n"
		if err := os.WriteFile(cfgPath, []byte(custom), 0o644); err != nil {
			t.Fatal(err)
		}

		svc := NewSettingsService(settingstore.New(settingstore.Default(), cfgPath))
		var opened string
		svc.openFile = func(p string) error {
			opened = p
			return nil
		}

		if err := svc.OpenConfigFile(); err != nil {
			t.Fatalf("OpenConfigFile() error = %v", err)
		}
		if opened != cfgPath {
			t.Fatalf("opened = %q, want %q", opened, cfgPath)
		}
		data, err := os.ReadFile(cfgPath)
		if err != nil {
			t.Fatal(err)
		}
		if string(data) != custom {
			t.Fatalf("config content changed: got %q want %q", string(data), custom)
		}
	})

	t.Run("errors when openFile fails", func(t *testing.T) {
		svc := newTestService(t)
		svc.openFile = func(string) error { return errors.New("viewer error") }

		err := svc.OpenConfigFile()
		if err == nil || !strings.Contains(err.Error(), "无法打开配置文件") {
			t.Fatalf("got err = %v, want openFile error", err)
		}
	})

	t.Run("errors when persistPath is invalid", func(t *testing.T) {
		svc := NewSettingsService(settingstore.New(settingstore.Default(), ""))
		svc.openFile = func(string) error {
			t.Fatal("openFile should not be called when persistPath is invalid")
			return nil
		}

		err := svc.OpenConfigFile()
		if err == nil || !strings.Contains(err.Error(), "准备配置文件失败") {
			t.Fatalf("got err = %v, want prepare config error", err)
		}
	})
}
