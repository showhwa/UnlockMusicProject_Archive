package convert

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"
)

func newQueueTestService(t *testing.T) *ConvertService {
	t.Helper()
	return newQueueTestServiceWithSettings(t, settingstore.Default())
}

func newQueueTestServiceWithSettings(t *testing.T, settings protocol.Settings) *ConvertService {
	t.Helper()
	lifecycle, stopLifecycle := context.WithCancel(context.Background())
	s := &ConvertService{
		store:         settingstore.New(settings, filepath.Join(t.TempDir(), "settings.toml")),
		job:           JobState{Status: JobStatusIdle, Message: idleMessage},
		lifecycle:     lifecycle,
		stopLifecycle: stopLifecycle,
	}
	t.Cleanup(func() {
		_ = s.ServiceShutdown()
	})
	return s
}

func TestClearFilesRejectsWhileRunning(t *testing.T) {
	for name, setup := range map[string]func(*ConvertService){
		"job running":       func(s *ConvertService) { s.job.Status = JobStatusRunning },
		"cancel before job": func(s *ConvertService) { s.cancel = func() {} },
	} {
		t.Run(name, func(t *testing.T) {
			s := newQueueTestService(t)
			s.ingestEntries([]FileEntry{{Path: "a.wav"}})
			s.mu.Lock()
			setup(s)
			s.mu.Unlock()
			before := s.GetState()
			if err := s.ClearFiles(); err == nil {
				t.Fatal("expected error while converting")
			}
			after := s.GetState()
			if after.Revision != before.Revision || len(after.Files) != 1 {
				t.Fatalf("queue changed during running clear: %+v", after)
			}
		})
	}
}

func TestClearFilesWhenIdle(t *testing.T) {
	s := newQueueTestService(t)
	if err := s.ClearFiles(); err != nil {
		t.Fatal(err)
	}
	empty := s.GetState().Revision

	s.ingestEntries([]FileEntry{{Path: "a.wav"}, {Path: "b.wav"}})
	if err := s.ClearFiles(); err != nil {
		t.Fatal(err)
	}
	state := s.GetState()
	if len(state.Files) != 0 || state.Revision <= empty {
		t.Fatalf("queue was not cleared: %+v", state)
	}
}

func TestRemoveFilesRejectsWhileCancelSet(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{{Path: "a.wav"}})
	s.mu.Lock()
	s.cancel = func() {}
	s.mu.Unlock()
	before := s.GetState()
	if err := s.RemoveFiles([]string{"a.wav"}); err == nil {
		t.Fatal("expected error while a queue is starting")
	}
	after := s.GetState()
	if after.Revision != before.Revision || len(after.Files) != 1 {
		t.Fatalf("list changed during pre-running remove: %+v", after)
	}
}

func TestRunQueueCancelledBeforeFileKeepsProgress(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{{Path: "a.wav"}, {Path: "b.wav"}})
	_, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	files := append([]*FileEntry(nil), s.files...)
	s.cancel = cancel
	s.queueStarted = true
	s.queueCancelled = true
	s.job = JobState{Status: JobStatusRunning, Total: 2}
	s.mu.Unlock()

	s.runQueue(context.Background(), files, settingstore.Default(), nil, t.TempDir(), nil)

	state := s.GetState()
	wantMsg := formatJobMessage(jobMsgCancelled, 0, 2, 0, 0, 0)
	if state.Job.Status != JobStatusCancelled || state.Job.Message != wantMsg || state.Job.Total != 2 {
		t.Fatalf("unexpected cancelled job: %+v", state.Job)
	}
	if state.Job.Percent != 0 || state.Job.Current != 0 {
		t.Fatalf("cancel before the first file should report 0 progress: %+v", state.Job)
	}
	s.mu.Lock()
	remainingCancel := s.cancel
	s.mu.Unlock()
	if remainingCancel != nil {
		t.Fatal("finishing the queue must release s.cancel")
	}
}

func TestCancelAfterLastFileKeepsLastPercent(t *testing.T) {
	s := newQueueTestService(t)
	s.mu.Lock()
	s.queueStarted = true
	s.queueCancelled = true
	s.mu.Unlock()

	doneFiles := []*FileEntry{
		{Path: "a.wav", Status: FileStatusSuccess, Progress: 100, OutputPath: "a.out"},
		{Path: "b.wav", Status: FileStatusSuccess, Progress: 100, OutputPath: "b.out"},
	}
	s.runQueue(context.Background(), doneFiles, settingstore.Default(), nil, t.TempDir(), nil)

	job := s.GetState().Job
	if job.Status != JobStatusDone {
		t.Fatalf("all files done with cancel flag should finish as done, got %+v", job)
	}
	if job.Percent != 100 {
		t.Fatalf("percent = %v, want 100", job.Percent)
	}
}

func TestCancelConvertCancelsContextBeforeStart(t *testing.T) {
	s := newQueueTestService(t)
	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancel = cancel
	s.queueStarted = false
	s.mu.Unlock()
	s.CancelConvert()
	if ctx.Err() == nil {
		t.Fatal("CancelConvert should cancel ctx before queue start")
	}
}

func TestCancelConvertDoesNotCancelContextAfterStart(t *testing.T) {
	s := newQueueTestService(t)
	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancel = cancel
	s.queueStarted = true
	s.mu.Unlock()
	s.CancelConvert()
	if ctx.Err() != nil {
		t.Fatal("CancelConvert must not cancel ctx after queue start")
	}
	if !s.isQueueCancelled() {
		t.Fatal("CancelConvert must set queueCancelled after queue start")
	}
}

func TestServiceShutdownStopsWatcher(t *testing.T) {
	store := settingstore.New(settingstore.Default(), filepath.Join(t.TempDir(), "settings.toml"))
	s := NewConvertService(store)
	ctx, cancel := context.WithCancel(context.Background())
	s.mu.Lock()
	s.cancel = cancel
	s.mu.Unlock()

	if err := s.ServiceShutdown(); err != nil {
		t.Fatal(err)
	}
	if err := s.ServiceShutdown(); err != nil {
		t.Fatalf("second shutdown: %v", err)
	}
	select {
	case <-s.watchDone:
	case <-time.After(5 * time.Second):
		t.Fatal("watchSettings did not stop after ServiceShutdown")
	}
	if ctx.Err() == nil {
		t.Fatal("ServiceShutdown must cancel the running queue")
	}
}

func TestServiceShutdownWithoutWatcher(t *testing.T) {
	if err := (&ConvertService{}).ServiceShutdown(); err != nil {
		t.Fatal(err)
	}
}

type stubQueueAlgo struct {
	exts      []string
	deepProbe func(ctx context.Context, path string) (bool, error)
	decrypt   func(src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error)
}

func (a *stubQueueAlgo) GetSupportedExtensions() []string { return a.exts }

func (a *stubQueueAlgo) DeepProbe(ctx context.Context, path string) (bool, error) {
	if a.deepProbe != nil {
		return a.deepProbe(ctx, path)
	}
	return protocol.MatchesAnyExtension(path, a.exts), nil
}

func (a *stubQueueAlgo) Decrypt(src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	if a.decrypt != nil {
		return a.decrypt(src, dest, settings)
	}
	return protocol.DecryptResult{}, errors.New("unexpected decrypt")
}

func (a *stubQueueAlgo) PopulateSupportedFormats(map[string][]string) {}

func TestStartConvertCancelledDuringPreflight(t *testing.T) {
	dir := t.TempDir()
	tempDir := filepath.Join(dir, "never-created-temp")
	settings := settingstore.Default()
	settings.OutputFormat = "flac"
	settings.TempDir = tempDir
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
	settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")

	s := newQueueTestServiceWithSettings(t, settings)
	flacPath := filepath.Join(dir, "song.flac")
	s.files = []*FileEntry{{Path: flacPath, Name: "song.flac", Status: FileStatusPending}}
	s.setDecryptAlgos(func(ctx context.Context, _ *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{&stubQueueAlgo{
			deepProbe: func(probeCtx context.Context, _ string) (bool, error) {
				s.CancelConvert()
				<-probeCtx.Done()
				return false, probeCtx.Err()
			},
		}}
	})

	err := s.StartConvert("", "")
	if !errors.Is(err, errConvertCancelled) {
		t.Fatalf("StartConvert err = %v, want errConvertCancelled", err)
	}
	if _, statErr := os.Stat(tempDir); !errors.Is(statErr, os.ErrNotExist) {
		t.Fatalf("tempDir should not be created when preflight is cancelled, stat err = %v", statErr)
	}
	state := s.GetState()
	if state.Job.Status != JobStatusIdle {
		t.Fatalf("job status = %q, want idle", state.Job.Status)
	}
	s.mu.Lock()
	cancel := s.cancel
	s.mu.Unlock()
	if cancel != nil {
		t.Fatal("s.cancel must be cleared after cancelled StartConvert")
	}
}

func TestStartConvertProbesUnlabeledFlacOnce(t *testing.T) {
	for _, tc := range []struct {
		name  string
		claim bool
	}{
		{name: "unclaimed plain flac", claim: false},
		{name: "claimed disguised flac", claim: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			srcDir := filepath.Join(dir, "src")
			outDir := filepath.Join(dir, "out")
			if err := os.MkdirAll(srcDir, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.MkdirAll(outDir, 0o755); err != nil {
				t.Fatal(err)
			}
			flacPath := writePlaceholderExecutable(t, srcDir, "song.flac")
			writePlaceholderExecutable(t, outDir, "song.flac")

			settings := settingstore.Default()
			settings.OutputFormat = "flac"
			settings.OutputTarget = protocol.OutputTargetCustom
			settings.OutputDir = outDir
			settings.ExistingOutputMode = protocol.ExistingOutputSkip
			settings.TempDir = filepath.Join(dir, "temp")
			settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
			settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")

			var probes atomic.Int32
			s := newQueueTestServiceWithSettings(t, settings)
			s.files = []*FileEntry{{Path: flacPath, Name: "song.flac", Status: FileStatusPending}}
			s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
				return []protocol.Algo{&stubQueueAlgo{
					deepProbe: func(_ context.Context, path string) (bool, error) {
						if path == flacPath {
							probes.Add(1)
						}
						return tc.claim, nil
					},
					decrypt: func(_ string, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
						if err := os.WriteFile(dest, []byte("decrypted"), 0o644); err != nil {
							return protocol.DecryptResult{}, err
						}
						return protocol.DecryptResult{AudioPath: dest}, nil
					},
				}}
			})

			if err := s.StartConvert("", ""); err != nil {
				t.Fatal(err)
			}
			state := waitForQueue(t, s)
			if state.Job.Status != JobStatusDone || state.Files[0].Status != FileStatusSkipped {
				t.Fatalf("unexpected queue result: %+v", state)
			}
			if got := probes.Load(); got != 1 {
				t.Fatalf("DeepProbe call count = %d, want 1", got)
			}
		})
	}
}

func TestRunQueueCancelMidFirstFileOfTwoKeepsProgress(t *testing.T) {
	dir := t.TempDir()
	srcDir := filepath.Join(dir, "src")
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	first := writePlaceholderExecutable(t, srcDir, "first.ncm")
	second := writePlaceholderExecutable(t, srcDir, "second.ncm")
	writePlaceholderExecutable(t, outDir, "first.flac")
	writePlaceholderExecutable(t, outDir, "second.flac")

	settings := settingstore.Default()
	settings.EnableParallel = false
	settings.OutputFormat = "flac"
	settings.OutputTarget = protocol.OutputTargetCustom
	settings.OutputDir = outDir
	settings.ExistingOutputMode = protocol.ExistingOutputSkip
	settings.TempDir = filepath.Join(dir, "temp")
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
	settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")

	s := newQueueTestServiceWithSettings(t, settings)

	firstStarted := make(chan struct{})
	releaseFirst := make(chan struct{})
	var secondStarted atomic.Int32
	var runCtx atomic.Pointer[context.Context]

	s.setDecryptAlgos(func(ctx context.Context, _ *protocol.Settings) []protocol.Algo {
		c := ctx
		runCtx.Store(&c)
		return []protocol.Algo{&stubQueueAlgo{
			exts: []string{".ncm"},
			decrypt: func(src, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
				if src == second {
					secondStarted.Add(1)
				}
				if src == first {
					close(firstStarted)
					<-releaseFirst
					if cur := runCtx.Load(); cur != nil && (*cur).Err() != nil {
						return protocol.DecryptResult{}, (*cur).Err()
					}
				}
				if err := os.WriteFile(dest, []byte("decrypted"), 0o644); err != nil {
					return protocol.DecryptResult{}, err
				}
				return protocol.DecryptResult{AudioPath: dest}, nil
			},
		}}
	})
	s.ingestEntries([]FileEntry{fileEntryFromPath(first), fileEntryFromPath(second)})

	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}

	select {
	case <-firstStarted:
	case <-time.After(5 * time.Second):
		t.Fatal("first file did not start decrypting")
	}

	s.CancelConvert()
	if cur := runCtx.Load(); cur == nil || (*cur).Err() != nil {
		t.Fatal("CancelConvert must not cancel in-flight worker context")
	}
	close(releaseFirst)

	state := waitForQueue(t, s)
	wantMsg := formatJobMessage(jobMsgCancelled, 1, 2, 0, 1, 0)
	if state.Job.Status != JobStatusCancelled || state.Job.Message != wantMsg {
		t.Fatalf("unexpected cancelled job: %+v, want status=%q msg=%q", state.Job, JobStatusCancelled, wantMsg)
	}
	if state.Job.Current != 1 || state.Job.Total != 2 || state.Job.Percent != 50 {
		t.Fatalf("unexpected progress: %+v", state.Job)
	}
	if state.Files[0].Status != FileStatusSkipped {
		t.Fatalf("first file should finish cleanly, got %+v", state.Files[0])
	}
	if state.Files[1].Status != FileStatusPending {
		t.Fatalf("second file must remain pending, got %+v", state.Files[1])
	}
	if secondStarted.Load() != 0 {
		t.Fatalf("second file must never start after cancel, got %d starts", secondStarted.Load())
	}
}

func TestRunQueueCancelledAtStartAllFailedReturnsError(t *testing.T) {
	s := newQueueTestService(t)
	failedFiles := []*FileEntry{
		{Path: "a.wav", Status: FileStatusFailed, Progress: 100, Error: "err a"},
		{Path: "b.wav", Status: FileStatusFailed, Progress: 100, Error: "err b"},
	}
	s.mu.Lock()
	s.queueStarted = true
	s.queueCancelled = true
	s.mu.Unlock()

	s.runQueue(context.Background(), failedFiles, settingstore.Default(), nil, t.TempDir(), nil)

	job := s.GetState().Job
	wantMsg := formatJobMessage(jobMsgDone, 2, 2, 0, 0, 2)
	if job.Status != JobStatusError || job.Message != wantMsg || job.Percent != 100 {
		t.Fatalf("unexpected job state: %+v", job)
	}
}

func TestRunQueueParallelWorkerPool(t *testing.T) {
	runBatch := func(t *testing.T, enableParallel bool, parallel int, requireConcurrency bool) AppSnapshot {
		t.Helper()
		dir := t.TempDir()
		srcDir := filepath.Join(dir, "src")
		outDir := filepath.Join(dir, "out")
		if err := os.MkdirAll(srcDir, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.MkdirAll(outDir, 0o755); err != nil {
			t.Fatal(err)
		}
		a := writePlaceholderExecutable(t, srcDir, "a.ncm")
		b := writePlaceholderExecutable(t, srcDir, "b.ncm")
		c := writePlaceholderExecutable(t, srcDir, "c.ncm")
		writePlaceholderExecutable(t, outDir, "a.flac")
		writePlaceholderExecutable(t, outDir, "b.flac")

		settings := settingstore.Default()
		settings.EnableParallel = enableParallel
		settings.Parallel = parallel
		settings.OutputFormat = "flac"
		settings.OutputTarget = protocol.OutputTargetCustom
		settings.OutputDir = outDir
		settings.ExistingOutputMode = protocol.ExistingOutputSkip
		settings.TempDir = filepath.Join(dir, "temp")
		settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
		settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")

		s := newQueueTestServiceWithSettings(t, settings)

		var inFlight atomic.Int32
		bothEntered := make(chan struct{})
		var closedOnce atomic.Bool

		s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
			return []protocol.Algo{&stubQueueAlgo{
				exts: []string{".ncm"},
				decrypt: func(src, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
					if requireConcurrency && (src == a || src == b) {
						if inFlight.Add(1) >= 2 && closedOnce.CompareAndSwap(false, true) {
							close(bothEntered)
						}
						select {
						case <-bothEntered:
						case <-time.After(3 * time.Second):
							return protocol.DecryptResult{}, errors.New("timed out waiting for concurrent workers")
						}
					}
					if src == c {
						return protocol.DecryptResult{}, errors.New("decrypt failed for c")
					}
					if err := os.WriteFile(dest, []byte("ok"), 0o644); err != nil {
						return protocol.DecryptResult{}, err
					}
					return protocol.DecryptResult{AudioPath: dest}, nil
				},
			}}
		})
		s.ingestEntries([]FileEntry{fileEntryFromPath(a), fileEntryFromPath(b), fileEntryFromPath(c)})

		if err := s.StartConvert("", ""); err != nil {
			t.Fatal(err)
		}
		return waitForQueue(t, s)
	}

	parallelSnap := runBatch(t, true, 2, true)
	serialSnap := runBatch(t, false, 2, false)

	wantMsg := formatJobMessage(jobMsgDone, 3, 3, 0, 2, 1)
	for label, snap := range map[string]AppSnapshot{"parallel": parallelSnap, "serial": serialSnap} {
		if snap.Job.Status != JobStatusDone || snap.Job.Message != wantMsg || snap.Job.Percent != 100 || snap.Job.Current != 3 {
			t.Fatalf("%s job = %+v, want done/%q/100", label, snap.Job, wantMsg)
		}
		if snap.Files[0].Status != FileStatusSkipped || snap.Files[1].Status != FileStatusSkipped || snap.Files[2].Status != FileStatusFailed {
			t.Fatalf("%s files = %+v", label, snap.Files)
		}
		if !strings.Contains(snap.Files[2].Error, "decrypt failed for c") {
			t.Fatalf("%s failed entry missing error: %+v", label, snap.Files[2])
		}
	}
}

func TestRunQueueAllFailedSetsErrorStatusAndDoneTemplate(t *testing.T) {
	dir := t.TempDir()
	settings := settingstore.Default()
	settings.EnableParallel = false
	settings.OutputFormat = "flac"
	settings.TempDir = filepath.Join(dir, "temp")
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")

	s := newQueueTestServiceWithSettings(t, settings)
	missing1 := filepath.Join(dir, "missing_one.wav")
	missing2 := filepath.Join(dir, "missing_two.wav")
	s.ingestEntries([]FileEntry{{Path: missing1}, {Path: missing2}})

	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	state := waitForQueue(t, s)
	wantMsg := formatJobMessage(jobMsgDone, 2, 2, 0, 0, 2)
	if state.Job.Status != JobStatusError || state.Job.Message != wantMsg || state.Job.Percent != 100 || state.Job.Current != 2 {
		t.Fatalf("unexpected all-failed job: %+v", state.Job)
	}
	if strings.Contains(state.Job.Message, "missing_one") || strings.Contains(state.Job.Message, "missing_two") {
		t.Fatalf("job message must not contain filenames: %q", state.Job.Message)
	}
	for i, f := range state.Files {
		if f.Status != FileStatusFailed || f.Error == "" {
			t.Fatalf("file[%d] should be failed with error: %+v", i, f)
		}
	}
}

func TestRunQueueSingleFailureContinuesSubsequentFiles(t *testing.T) {
	dir := t.TempDir()
	srcDir := filepath.Join(dir, "src")
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	missing := filepath.Join(srcDir, "broken.wav")
	valid := writePlaceholderExecutable(t, srcDir, "good.wav")
	writePlaceholderExecutable(t, outDir, "good.flac")

	settings := settingstore.Default()
	settings.EnableParallel = false
	settings.OutputFormat = "flac"
	settings.OutputTarget = protocol.OutputTargetCustom
	settings.OutputDir = outDir
	settings.ExistingOutputMode = protocol.ExistingOutputSkip
	settings.TempDir = filepath.Join(dir, "temp")
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")

	s := newQueueTestServiceWithSettings(t, settings)
	s.ingestEntries([]FileEntry{{Path: missing}, {Path: valid}})

	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	state := waitForQueue(t, s)
	wantMsg := formatJobMessage(jobMsgDone, 2, 2, 0, 1, 1)
	if state.Job.Status != JobStatusDone || state.Job.Message != wantMsg || state.Job.Percent != 100 {
		t.Fatalf("unexpected job: %+v", state.Job)
	}
	if state.Files[0].Status != FileStatusFailed || state.Files[0].Error == "" {
		t.Fatalf("file[0] should fail with error: %+v", state.Files[0])
	}
	if state.Files[1].Status != FileStatusSkipped || state.Files[1].Error != "" {
		t.Fatalf("file[1] should continue and finish as skipped: %+v", state.Files[1])
	}
}

func TestMixedSummaryTemplatesExcludeFilenames(t *testing.T) {
	s := newQueueTestService(t)
	files := []*FileEntry{
		{Name: "alpha.wav", Path: "alpha.wav", Status: FileStatusSuccess, Progress: 100, OutputPath: "alpha.flac"},
		{Name: "beta.wav", Path: "beta.wav", Status: FileStatusSuccess, Progress: 100, OutputPath: "beta.flac"},
		{Name: "gamma.wav", Path: "gamma.wav", Status: FileStatusSkipped, Progress: 100, OutputPath: "gamma.flac"},
		{Name: "delta.wav", Path: "delta.wav", Status: FileStatusFailed, Progress: 100, Error: "boom"},
	}

	s.mu.Lock()
	running := s.summarizeJobLocked(files, jobMsgRunning, JobStatusRunning)
	done := s.summarizeJobLocked(files, jobMsgDone, JobStatusDone)
	s.mu.Unlock()

	wantRunning := "已处理 4/4 个文件，成功 2，跳过 1，错误 1"
	wantDone := "转换完成，已处理 4/4 个文件，成功 2，跳过 1，错误 1"
	if running.Message != wantRunning || running.Current != 4 || running.Total != 4 {
		t.Fatalf("running summary = %+v, want %q", running, wantRunning)
	}
	if done.Message != wantDone || done.Current != 4 || done.Total != 4 {
		t.Fatalf("done summary = %+v, want %q", done, wantDone)
	}
	for _, name := range []string{"alpha", "beta", "gamma", "delta"} {
		if strings.Contains(running.Message, name) || strings.Contains(done.Message, name) {
			t.Fatalf("summary message must not contain filename %q", name)
		}
	}
}

func TestCleanupSourceFailureKeepsDoneWithinTotalAndClearsEntryError(t *testing.T) {
	s := newQueueTestService(t)
	s.ingestEntries([]FileEntry{fileEntryFromPath("song.ncm")})
	s.mu.Lock()
	files := append([]*FileEntry(nil), s.files...)
	s.mu.Unlock()

	s.recordFileCompletion(files, files[0], fileResult{
		status:     FileStatusSuccess,
		outputPath: "song.wav",
		errMessage: "输出成功但删除源文件失败: access denied",
	}, true)

	running := s.GetState()
	wantRunning := "已处理 1/1 个文件，成功 1，跳过 0，错误 1"
	if running.Job.Current != 1 || running.Job.Total != 1 || running.Job.Message != wantRunning {
		t.Fatalf("running state after cleanupSource failure = %+v, want %q", running.Job, wantRunning)
	}
	if running.Files[0].Status != FileStatusSuccess || running.Files[0].Error != "" {
		t.Fatalf("file entry should be success with cleared error: %+v", running.Files[0])
	}

	s.finishWithSummary(files, jobMsgDone, JobStatusDone)
	done := s.GetState()
	wantDone := "转换完成，已处理 1/1 个文件，成功 1，跳过 0，错误 1"
	if done.Job.Status != JobStatusDone || done.Job.Current != 1 || done.Job.Total != 1 || done.Job.Message != wantDone {
		t.Fatalf("done state after cleanupSource failure = %+v, want %q", done.Job, wantDone)
	}
	s.mu.Lock()
	extraAfterFinish := s.queueExtraErrors
	s.mu.Unlock()
	if extraAfterFinish != 0 {
		t.Fatalf("queueExtraErrors must be reset on finish, got %d", extraAfterFinish)
	}
}

func TestRunQueueCleanupSourceFailureEndToEnd(t *testing.T) {
	ffmpeg, err := exec.LookPath("ffmpeg")
	if err != nil {
		t.Skip("ffmpeg is required for end-to-end cleanupSource test")
	}
	dir := t.TempDir()
	audio := filepath.Join(dir, "decrypted.wav")
	if output, err := exec.Command(ffmpeg, "-f", "lavfi", "-i", "anullsrc", "-t", "0.1", audio).CombinedOutput(); err != nil {
		t.Fatalf("generate WAV fixture: %v\n%s", err, output)
	}
	src := writePlaceholderExecutable(t, dir, "source.ncm")

	settings := settingstore.Default()
	settings.EnableParallel = false
	settings.OutputFormat = string(protocol.FormatNone)
	settings.FFmpeg.Path = ffmpeg
	settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")
	settings.DeleteSourceAfterConvert = true
	settings.TempDir = filepath.Join(dir, "temp")

	s := newQueueTestServiceWithSettings(t, settings)
	s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{sourceDisappears{audio}}
	})
	s.ingestEntries([]FileEntry{fileEntryFromPath(src)})

	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	state := waitForQueue(t, s)
	wantDone := "转换完成，已处理 1/1 个文件，成功 1，跳过 0，错误 1"
	if state.Job.Status != JobStatusDone || state.Job.Current != 1 || state.Job.Total != 1 || state.Job.Message != wantDone {
		t.Fatalf("unexpected job after cleanupSource failure: %+v", state.Job)
	}
	if state.Files[0].Status != FileStatusSuccess || state.Files[0].Error != "" || state.Files[0].OutputPath == "" {
		t.Fatalf("unexpected file entry after cleanupSource failure: %+v", state.Files[0])
	}
}

func TestRetryFailedFilesAfterWriteOutputFailureResetsStatusAndSupportsCancel(t *testing.T) {
	dir := t.TempDir()
	srcDir := filepath.Join(dir, "src")
	outDir := filepath.Join(dir, "out")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		t.Fatal(err)
	}
	first := writePlaceholderExecutable(t, srcDir, "first.ncm")
	second := writePlaceholderExecutable(t, srcDir, "second.ncm")

	settings := settingstore.Default()
	settings.EnableParallel = false
	settings.OutputFormat = "flac"
	settings.OutputTarget = protocol.OutputTargetCustom
	settings.OutputDir = outDir
	settings.ExistingOutputMode = protocol.ExistingOutputOverwrite
	settings.TempDir = filepath.Join(dir, "temp")
	// Placeholder non-executable ffmpeg causes writeOutput to fail after reserve.
	settings.FFmpeg.Path = writePlaceholderExecutable(t, dir, "ffmpeg.exe")
	settings.Binaries.UmCliRs = writePlaceholderExecutable(t, dir, "um_cli_rs.exe")

	s := newQueueTestServiceWithSettings(t, settings)

	s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{&stubQueueAlgo{
			exts: []string{".ncm"},
			decrypt: func(_, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
				if err := os.WriteFile(dest, []byte("decrypted"), 0o644); err != nil {
					return protocol.DecryptResult{}, err
				}
				return protocol.DecryptResult{AudioPath: dest}, nil
			},
		}}
	})
	s.ingestEntries([]FileEntry{fileEntryFromPath(first), fileEntryFromPath(second)})

	// Run 1: both fail in writeOutput; OutputPath must remain "" so they are retryable.
	if err := s.StartConvert("", ""); err != nil {
		t.Fatal(err)
	}
	run1 := waitForQueue(t, s)
	if run1.Job.Status != JobStatusError {
		t.Fatalf("run1 job status = %q, want error", run1.Job.Status)
	}
	for i, f := range run1.Files {
		if f.Status != FileStatusFailed || f.OutputPath != "" || f.Error == "" {
			t.Fatalf("run1 file[%d] must be failed with empty OutputPath and non-empty Error: %+v", i, f)
		}
	}

	// Run 2 (retry): switch to Skip with pre-existing outputs, block first file,
	// verify status reset to pending & percent == 0, then cancel mid-retry.
	writePlaceholderExecutable(t, outDir, "first.flac")
	writePlaceholderExecutable(t, outDir, "second.flac")
	if _, err := s.store.PatchState(map[string]any{
		"existingOutputMode": string(protocol.ExistingOutputSkip),
	}); err != nil {
		t.Fatal(err)
	}

	retryFirstStarted := make(chan struct{})
	releaseRetryFirst := make(chan struct{})
	s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{&stubQueueAlgo{
			exts: []string{".ncm"},
			decrypt: func(src, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
				if src == first {
					close(retryFirstStarted)
					<-releaseRetryFirst
				}
				if err := os.WriteFile(dest, []byte("decrypted"), 0o644); err != nil {
					return protocol.DecryptResult{}, err
				}
				return protocol.DecryptResult{AudioPath: dest}, nil
			},
		}}
	})

	if err := s.StartConvert("", ""); err != nil {
		t.Fatalf("retry StartConvert failed: %v", err)
	}
	select {
	case <-retryFirstStarted:
	case <-time.After(5 * time.Second):
		t.Fatal("retry first file did not start")
	}

	midRetry := s.GetState()
	if midRetry.Files[0].Status != FileStatusPending || midRetry.Files[1].Status != FileStatusPending {
		t.Fatalf("retry must reset file statuses to pending: %+v", midRetry.Files)
	}
	if midRetry.Files[0].Error != "" || midRetry.Files[1].Error != "" {
		t.Fatalf("retry must clear previous errors: %+v", midRetry.Files)
	}
	if midRetry.Job.Percent != 0 || midRetry.Job.Current != 0 {
		t.Fatalf("retry mid-first-file at 0%% must not report stale 100%%: %+v", midRetry.Job)
	}

	s.CancelConvert()
	close(releaseRetryFirst)

	run2 := waitForQueue(t, s)
	wantCancelled := formatJobMessage(jobMsgCancelled, 1, 2, 0, 1, 0)
	if run2.Job.Status != JobStatusCancelled || run2.Job.Message != wantCancelled || run2.Job.Percent != 50 {
		t.Fatalf("unexpected retry-cancelled job: %+v, want %q", run2.Job, wantCancelled)
	}
	if run2.Files[0].Status != FileStatusSkipped || run2.Files[1].Status != FileStatusPending {
		t.Fatalf("unexpected retry-cancelled files: %+v", run2.Files)
	}

	// Run 3: retry remaining pending second file to completion.
	s.setDecryptAlgos(func(context.Context, *protocol.Settings) []protocol.Algo {
		return []protocol.Algo{&stubQueueAlgo{
			exts: []string{".ncm"},
			decrypt: func(_, dest string, _ *protocol.Settings) (protocol.DecryptResult, error) {
				if err := os.WriteFile(dest, []byte("decrypted"), 0o644); err != nil {
					return protocol.DecryptResult{}, err
				}
				return protocol.DecryptResult{AudioPath: dest}, nil
			},
		}}
	})
	if err := s.StartConvert("", ""); err != nil {
		t.Fatalf("final retry failed: %v", err)
	}
	run3 := waitForQueue(t, s)
	if run3.Job.Status != JobStatusDone || run3.Job.Total != 1 || run3.Files[1].Status != FileStatusSkipped || run3.Files[1].Error != "" {
		t.Fatalf("unexpected final retry result: %+v", run3)
	}
}
