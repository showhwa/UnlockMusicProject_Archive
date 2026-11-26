package convert

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"sync"

	"git.um-react.app/um/um-conv/app/avconv"
	"git.um-react.app/um/um-conv/app/protocol"
)

const cancelledMessage = "转换已取消"

func queueHasPending(files []*FileEntry) bool {
	for _, f := range files {
		if f.Status == FileStatusPending && f.OutputPath == "" {
			return true
		}
	}
	return false
}

// errConvertCancelled is returned by StartConvert when the queue is cancelled
// during its pre-flight checks, before any job state is published.
var errConvertCancelled = errors.New(cancelledMessage)

// StartConvert 启动队列转换。inputPath / outputPath 保留以兼容前端绑定，当前忽略。
func (s *ConvertService) StartConvert(inputPath, outputPath string) error {
	_ = inputPath
	_ = outputPath

	s.mu.Lock()
	if s.isRunningLocked() {
		s.mu.Unlock()
		return fmt.Errorf("已有转换任务在进行中")
	}
	files := make([]*FileEntry, 0, len(s.files))
	for _, file := range s.files {
		if file.OutputPath == "" {
			files = append(files, file)
		}
	}
	if len(files) == 0 {
		empty := len(s.files) == 0
		s.mu.Unlock()
		if empty {
			return fmt.Errorf("请先添加要转换的文件")
		}
		return fmt.Errorf("没有待转换的文件")
	}
	s.queueCancelled = false
	s.queueStarted = false
	s.queueExtraErrors = 0
	ctx, cancel := context.WithCancel(s.lifecycleContext())
	s.cancel = cancel
	s.mu.Unlock()

	if err := s.startQueue(ctx, files); err != nil {
		s.mu.Lock()
		cancel()
		s.cancel = nil
		s.queueCancelled = false
		s.queueStarted = false
		s.queueExtraErrors = 0
		s.mu.Unlock()
		return err
	}
	return nil
}

func (s *ConvertService) startQueue(ctx context.Context, files []*FileEntry) error {
	settings := s.store.Snapshot()
	profile, err := s.findProfile(settings.OutputFormat)
	if err != nil {
		return err
	}

	probeSettings := settings
	paths := make([]string, len(files))
	for i, file := range files {
		paths[i] = file.Path
	}
	if hasUnlabeledFlac(paths) {
		probeSettings = settingsWithResolvedUmCliRs(settings)
	}
	preflight, err := s.queueNeedsDecrypt(ctx, probeSettings, files)
	if err != nil {
		if ctx.Err() != nil {
			return errConvertCancelled
		}
		return err
	}
	settings, err = prepareSettingsForConvert(settings, preflight.needDecrypt)
	if err != nil {
		return err
	}
	if ctx.Err() != nil {
		return errConvertCancelled
	}

	tempDir := protocol.ResolveTempDir(&settings)
	if err := os.MkdirAll(tempDir, 0o755); err != nil {
		return fmt.Errorf("无法创建临时目录 %s: %w", tempDir, err)
	}

	s.mu.Lock()
	if ctx.Err() != nil || s.queueCancelled {
		s.mu.Unlock()
		return errConvertCancelled
	}
	for _, file := range files {
		file.Status = FileStatusPending
		file.Progress = 0
		file.Error = ""
	}
	total := len(files)
	s.queueStarted = true
	s.job = JobState{
		Percent: 0,
		Status:  JobStatusRunning,
		Message: formatJobMessage(jobMsgRunning, 0, total, 0, 0, 0),
		Current: 0,
		Total:   total,
	}
	snap := s.nextSnapshotLocked()
	s.mu.Unlock()
	s.emitSnapshot(snap)

	slog.Info("convert started", "count", len(files), "format", profile.ID, "tempDir", tempDir, "workers", protocol.ResolveParallel(settings.EnableParallel, settings.Parallel))
	go s.runQueue(ctx, files, settings, profile, tempDir, preflight.claims)
	return nil
}

// CancelConvert 取消正在进行的转换队列。
func (s *ConvertService) CancelConvert() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.queueCancelled = true
	if s.cancel != nil && !s.queueStarted {
		s.cancel()
	}
}

func (s *ConvertService) finishQueueLocked(job JobState) AppSnapshot {
	if s.cancel != nil {
		s.cancel()
	}
	s.cancel = nil
	s.queueCancelled = false
	s.queueStarted = false
	s.queueExtraErrors = 0
	s.job = job
	return s.nextSnapshotLocked()
}

func (s *ConvertService) finishWithSummary(files []*FileEntry, kind jobMessageKind, status string) {
	s.mu.Lock()
	job := s.summarizeJobLocked(files, kind, status)
	snap := s.finishQueueLocked(job)
	s.mu.Unlock()
	s.emitSnapshot(snap)
}

func (s *ConvertService) finishCancelledFromStats(files []*FileEntry) {
	s.finishWithSummary(files, jobMsgCancelled, JobStatusCancelled)
}

// runQueue converts files with a worker pool.
func (s *ConvertService) runQueue(ctx context.Context, files []*FileEntry, settings protocol.Settings, profile *protocol.OutputProfile, tempDir string, claims map[string]int) {
	s.mu.Lock()
	s.queueStarted = true
	cancelledAtStart := s.queueCancelled
	hasPendingAtStart := queueHasPending(files)
	_, _, failAtStart, _ := countFileStats(files)
	s.mu.Unlock()
	if cancelledAtStart && hasPendingAtStart {
		s.finishCancelledFromStats(files)
		return
	}
	if cancelledAtStart && !hasPendingAtStart && len(files) > 0 {
		status := JobStatusDone
		if failAtStart == len(files) {
			status = JobStatusError
		}
		s.finishWithSummary(files, jobMsgDone, status)
		return
	}

	ff := avconv.NewFFmpeg(&settings)
	algorithms := s.algoRegistry(ctx, &settings)
	registry := newOutputRegistry()
	workers := protocol.ResolveParallel(settings.EnableParallel, settings.Parallel)
	if workers > len(files) {
		workers = len(files)
	}

	var pickMu sync.Mutex
	next := 0
	pick := func() (file *FileEntry, index int, ok bool) {
		pickMu.Lock()
		defer pickMu.Unlock()
		if ctx.Err() != nil {
			return nil, 0, false
		}
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.queueCancelled {
			return nil, 0, false
		}
		for next < len(files) {
			f := files[next]
			i := next
			next++
			if f.OutputPath != "" {
				continue
			}
			return f, i, true
		}
		return nil, 0, false
	}

	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				file, index, ok := pick()
				if !ok {
					return
				}
				s.convertAndRecord(ctx, ff, file, algorithms, settings, profile, tempDir, claims, registry, files, index)
			}
		}()
	}
	wg.Wait()

	s.mu.Lock()
	cancelled := s.queueCancelled
	extraErrors := s.queueExtraErrors
	ok, skip, fail, done := countFileStats(files)
	total := len(files)
	hasUnclaimed := false
	if cancelled {
		for _, f := range files {
			if f.Status == FileStatusPending {
				hasUnclaimed = true
				break
			}
		}
	}
	s.mu.Unlock()

	if ctx.Err() != nil && !cancelled {
		// Application shutdown cancelled the context.
		s.finishCancelledFromStats(files)
		return
	}

	if cancelled && hasUnclaimed {
		s.finishCancelledFromStats(files)
		return
	}

	status := JobStatusDone
	if fail == total && total > 0 {
		status = JobStatusError
	}
	s.finishWithSummary(files, jobMsgDone, status)

	slog.Info("convert finished", "count", total, "done", done, "ok", ok, "skip", skip, "fail", fail+extraErrors)
}

func (s *ConvertService) convertAndRecord(
	ctx context.Context,
	ff *avconv.FFmpeg,
	file *FileEntry,
	algorithms algoRegistry,
	settings protocol.Settings,
	profile *protocol.OutputProfile,
	tempDir string,
	claims map[string]int,
	registry *outputRegistry,
	runFiles []*FileEntry,
	index int,
) {
	if ctx.Err() != nil {
		return
	}

	algo, err := algorithms.resolveClaimed(ctx, file.Path, claims)
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		slog.Error("resolve decryptor failed", "file", file.Path, "err", err)
		s.recordFileCompletion(runFiles, file, fileResult{status: FileStatusFailed, errMessage: err.Error()}, false)
		return
	}

	s.reportFileProgress(runFiles, file, 0, true)

	result, err := s.convertOne(ctx, ff, file, algo, settings, profile, tempDir, index, registry, runFiles)
	extraError := false
	if err != nil {
		if ctx.Err() != nil {
			return
		}
		if result.status == FileStatusSuccess {
			slog.Error("delete source failed", "file", file.Path, "err", err)
			extraError = true
		} else {
			slog.Error("convert file failed", "file", file.Path, "err", err)
		}
		if result.status == "" {
			result.status = FileStatusFailed
		}
		if result.errMessage == "" {
			result.errMessage = err.Error()
		}
	}
	if result.status != "" {
		s.recordFileCompletion(runFiles, file, result, extraError)
	}
}
