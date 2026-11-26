package convert

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"git.um-react.app/um/um-conv/app/avconv"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"
)

func TestStartConvertRetriesOnlyEntriesWithoutOutput(t *testing.T) {
	dir := t.TempDir()
	sourceDir := filepath.Join(dir, "source")
	if err := os.Mkdir(sourceDir, 0o755); err != nil {
		t.Fatal(err)
	}
	first := writePlaceholderExecutable(t, sourceDir, "first.wav")
	second := filepath.Join(sourceDir, "second.wav")
	firstOutput := writePlaceholderExecutable(t, dir, "first.flac")

	settings := settingstore.Default()
	settings.OutputFormat = "flac"
	settings.OutputTarget = protocol.OutputTargetCustom
	settings.OutputDir = dir
	settings.ExistingOutputMode = protocol.ExistingOutputSkip
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
	s := newQueueTestServiceWithSettings(t, settings)
	s.ingestEntries([]FileEntry{{Path: first}, {Path: second}})
	if files := s.GetState().Files; files[0].Status != FileStatusPending || files[1].Status != FileStatusPending {
		t.Fatalf("new entries must be pending: %+v", files)
	}

	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	initial := waitForQueue(t, s)
	if initial.Job.Total != 2 ||
		initial.Files[0].Status != FileStatusSkipped || initial.Files[0].OutputPath != firstOutput ||
		initial.Files[1].Status != FileStatusFailed || initial.Files[1].OutputPath != "" {
		t.Fatalf("unexpected initial result: %+v", initial)
	}

	// The first entry must be skipped even when its source has gone away.
	if err := os.Remove(first); err != nil {
		t.Fatal(err)
	}
	writePlaceholderExecutable(t, sourceDir, "second.wav")
	secondOutput := writePlaceholderExecutable(t, dir, "second.flac")
	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	retry := waitForQueue(t, s)
	if retry.Job.Total != 1 || retry.Job.Status != JobStatusDone ||
		retry.Files[1].Status != FileStatusSkipped || retry.Files[1].OutputPath != secondOutput {
		t.Fatalf("unexpected retry result: %+v", retry)
	}
	if err := s.StartConvert("", ""); err == nil || err.Error() != "没有待转换的文件" {
		t.Fatalf("expected no pending work, got %v", err)
	}
	if state := s.GetState(); state.Revision != retry.Revision {
		t.Fatal("starting an all-completed list changed the session")
	}
}

func TestRecordResultIgnoresRemovedEntry(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{{Path: "source.wav"}})
	s.mu.Lock()
	original := s.files[0]
	s.mu.Unlock()
	_ = s.RemoveFiles([]string{original.Path})
	s.ingestEntries([]FileEntry{{Path: original.Path}})

	before := s.GetState()
	s.recordResult(original, fileResult{status: FileStatusFailed})
	after := s.GetState()
	if after.Revision != before.Revision || after.Files[0].Status != FileStatusPending {
		t.Fatalf("old result reached the new entry: %+v", after.Files[0])
	}

	s.mu.Lock()
	current := s.files[0]
	s.mu.Unlock()
	s.recordResult(current, fileResult{status: FileStatusSuccess, outputPath: "new.flac"})
	after = s.GetState()
	if after.Revision <= before.Revision || after.Files[0].Status != FileStatusSuccess ||
		after.Files[0].OutputPath != "new.flac" || before.Files[0].Status != FileStatusPending {
		t.Fatalf("new result was not published independently: %+v", after.Files[0])
	}
}

func TestConvertOneReturnsOutputWhenSourceCleanupFails(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg is required for the copy integration test")
	}
	dir := t.TempDir()
	audio := filepath.Join(dir, "decrypted.wav")
	if output, err := exec.Command(ffmpeg, "-f", "lavfi", "-i", "anullsrc", "-t", "0.1", audio).CombinedOutput(); err != nil {
		t.Fatalf("generate WAV fixture: %v\n%s", err, output)
	}

	s := &ConvertService{store: settingstore.New(settingstore.Default(), filepath.Join(dir, "settings.toml"))}
	src := writePlaceholderExecutable(t, dir, "source.ncm")
	settings := protocol.Settings{
		FFmpeg:                   protocol.FFmpegSettings{Path: ffmpeg},
		DeleteSourceAfterConvert: true,
	}
	entry := &FileEntry{Path: src}
	result, err := s.convertOne(context.Background(), avconv.NewFFmpeg(&settings), entry, sourceDisappears{audio}, settings,
		&protocol.OutputProfile{Format: protocol.FormatNone}, dir, 0, newOutputRegistry(), []*FileEntry{entry})
	if err == nil || !strings.Contains(err.Error(), "输出成功但删除源文件失败") {
		t.Fatalf("expected source cleanup error, got %v", err)
	}
	want := filepath.Join(dir, "source.wav")
	if result.status != FileStatusSuccess || result.outputPath != want {
		t.Fatalf("got %+v, want successful output at %q", result, want)
	}
	if info, err := os.Stat(result.outputPath); err != nil || info.Size() == 0 {
		t.Fatalf("expected a nonempty output, got %v, %v", info, err)
	}
}

type sourceDisappears struct {
	audio string
}

func (a sourceDisappears) Decrypt(src, _ string, _ *protocol.Settings) (protocol.DecryptResult, error) {
	return protocol.DecryptResult{AudioPath: a.audio}, os.Remove(src)
}

func (sourceDisappears) GetSupportedExtensions() []string { return []string{".ncm"} }

func (a sourceDisappears) DeepProbe(_ context.Context, path string) (bool, error) {
	return protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()), nil
}

func (sourceDisappears) PopulateSupportedFormats(map[string][]string) {}

func TestRemoveFilesRejectsWhileRunning(t *testing.T) {
	s := newQueueTestService(t)
	s.mu.Lock()
	s.job = JobState{Status: JobStatusRunning}
	s.mu.Unlock()
	s.ingestEntries([]FileEntry{{Path: "a.wav"}})
	before := s.GetState()
	if err := s.RemoveFiles([]string{"a.wav"}); err == nil {
		t.Fatal("expected error while converting")
	}
	after := s.GetState()
	if after.Revision != before.Revision || len(after.Files) != 1 {
		t.Fatalf("list changed during running remove: %+v", after)
	}
}

func TestRecordResultClearsErrorOnSuccessAndSkip(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{{Path: "a.wav"}, {Path: "b.wav"}, {Path: "c.wav"}})
	s.mu.Lock()
	filesCopy := append([]*FileEntry(nil), s.files...)
	s.mu.Unlock()

	s.recordResult(filesCopy[0], fileResult{
		status:     FileStatusSuccess,
		outputPath: "a.flac",
		errMessage: "输出成功但删除源文件失败: permission denied",
	})
	s.recordResult(filesCopy[1], fileResult{
		status:     FileStatusSkipped,
		outputPath: "b.flac",
		errMessage: "stale error",
	})
	s.recordResult(filesCopy[2], fileResult{
		status:     FileStatusFailed,
		errMessage: "转码失败",
	})

	files := s.GetState().Files
	if files[0].Status != FileStatusSuccess || files[0].Error != "" || files[0].Progress != 100 {
		t.Fatalf("success entry should clear error and set progress 100: %+v", files[0])
	}
	if files[1].Status != FileStatusSkipped || files[1].Error != "" || files[1].Progress != 100 {
		t.Fatalf("skipped entry should clear error and set progress 100: %+v", files[1])
	}
	if files[2].Status != FileStatusFailed || files[2].Error != "转码失败" {
		t.Fatalf("failed entry should retain error: %+v", files[2])
	}
}

func TestReportFileProgressPublishesProgressAndThrottles(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{{Path: "a.wav"}, {Path: "b.wav"}})
	s.mu.Lock()
	files := append([]*FileEntry(nil), s.files...)
	s.mu.Unlock()

	before := s.GetState().Revision
	s.reportFileProgress(files, files[0], 50, false)
	first := s.GetState()
	if first.Revision != before+1 {
		t.Fatalf("first progress report should emit once: %d -> %d", before, first.Revision)
	}
	if first.Files[0].Progress != 50 {
		t.Fatalf("file[0].Progress = %v, want 50", first.Files[0].Progress)
	}
	if first.Job.Percent != 25 || first.Job.Current != 0 || first.Job.Total != 2 {
		t.Fatalf("unexpected job after 50%% of 1/2 files: %+v", first.Job)
	}
	wantRunning := formatJobMessage(jobMsgRunning, 0, 2, 0, 0, 0)
	if first.Job.Message != wantRunning {
		t.Fatalf("job message = %q, want %q", first.Job.Message, wantRunning)
	}

	// Second report immediately after must be throttled (no revision bump),
	// while still updating in-memory state immediately.
	s.reportFileProgress(files, files[0], 60, false)
	throttled := s.GetState()
	if throttled.Revision != first.Revision {
		t.Fatalf("throttled progress report must not bump revision: %d -> %d", first.Revision, throttled.Revision)
	}
	if throttled.Files[0].Progress != 60 || throttled.Job.Percent != 30 {
		t.Fatalf("throttled state not updated: file=%v job=%+v", throttled.Files[0].Progress, throttled.Job)
	}

	// Completion must emit immediately in a single snapshot (1 revision bump).
	s.recordFileCompletion(files, files[0], fileResult{
		status:     FileStatusSuccess,
		outputPath: "a.flac",
		errMessage: "should be cleared",
	}, false)
	completed := s.GetState()
	if completed.Revision != first.Revision+1 {
		t.Fatalf("completion must emit exactly one snapshot: %d -> %d", first.Revision, completed.Revision)
	}
	if completed.Files[0].Status != FileStatusSuccess || completed.Files[0].Error != "" || completed.Files[0].Progress != 100 {
		t.Fatalf("unexpected completed entry: %+v", completed.Files[0])
	}
	if completed.Job.Current != 1 || completed.Job.Percent != 50 {
		t.Fatalf("unexpected job after completion: %+v", completed.Job)
	}
}

func waitForQueue(t *testing.T, s *ConvertService) AppSnapshot {
	t.Helper()
	for deadline := time.Now().Add(5 * time.Second); time.Now().Before(deadline); {
		if state := s.GetState(); state.Job.Status != JobStatusRunning {
			return state
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("conversion queue did not finish")
	return AppSnapshot{}
}
