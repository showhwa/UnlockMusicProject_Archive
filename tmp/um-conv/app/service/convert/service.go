package convert

import (
	"context"
	"sync"
	"time"

	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"

	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	idleMessage          = "就绪。添加文件后点击「开始转换」。"
	progressEmitInterval = 80 * time.Millisecond
)

const (
	JobStatusIdle      = "idle"
	JobStatusRunning   = "running"
	JobStatusDone      = "done"
	JobStatusError     = "error"
	JobStatusCancelled = "cancelled"
)

// JobState 当前转换任务状态（服务内持有，经 AppSnapshot 推送）
type JobState struct {
	Percent     float64 `json:"percent"`
	Status      string  `json:"status"` // idle | running | done | error | cancelled
	Message     string  `json:"message"`
	Current     int     `json:"current"`     // count of finished files in this run
	Total       int     `json:"total"`       // queue size for this run
	Phase       string  `json:"phase"`       // decrypt | encode | copy | ""
	FilePercent float64 `json:"filePercent"` // progress within current file
}

type FileStatus string

const (
	FileStatusPending FileStatus = "pending"
	FileStatusSuccess FileStatus = "success"
	FileStatusFailed  FileStatus = "failed"
	FileStatusSkipped FileStatus = "skipped"
)

// SourceInfo describes the on-disk source file as shown in the UI.
type SourceInfo struct {
	OK          bool   `json:"ok"`
	BitrateKbps int    `json:"bitrateKbps"`
	Format      string `json:"format"`
	Player      string `json:"player"`
}

// OutputInfo describes a converted output file.
type OutputInfo struct {
	Format      string `json:"format"`
	BitrateKbps int    `json:"bitrateKbps"`
	Size        string `json:"size"`
}

// FileEntry 文件列表项
type FileEntry struct {
	Name       string     `json:"name"`
	Path       string     `json:"path"`
	Size       string     `json:"size"`
	Status     FileStatus `json:"status"`
	OutputPath string     `json:"outputPath"`
	Source     SourceInfo `json:"source"`
	Output     OutputInfo `json:"output"`
	Progress   float64    `json:"progress"`
	Error      string     `json:"error"`
}

// AppSnapshot 前端投影用的完整会话状态
type AppSnapshot struct {
	Revision         uint64                   `json:"revision"`
	SettingsRevision uint64                   `json:"settingsRevision"`
	Files            []FileEntry              `json:"files"`
	Settings         protocol.Settings        `json:"settings"`
	Profiles         []protocol.OutputProfile `json:"profiles"`
	Job              JobState                 `json:"job"`
}

// ConvertService 提供 ffmpeg 转换能力，并持有文件队列与任务状态
type ConvertService struct {
	mu sync.Mutex

	store    *settingstore.Store
	cancel   context.CancelFunc
	files    []*FileEntry
	job      JobState
	revision uint64

	// Lifecycle of watchSettings. Both stay nil for a service built without
	// NewConvertService, which has no watcher to stop.
	done      chan struct{}
	watchDone chan struct{}
	closeOnce sync.Once

	// lifecycle bounds background work (queues and source probes) and is
	// cancelled by ServiceShutdown. Set once in NewConvertService and never
	// reassigned, so it is read without s.mu; nil means context.Background().
	lifecycle     context.Context
	stopLifecycle context.CancelFunc
	shuttingDown  bool
	probeWG       sync.WaitGroup

	// decryptAlgos overrides DecryptAlgorithms in tests when non-nil.
	decryptAlgos func(context.Context, *protocol.Settings) []protocol.Algo

	queueCancelled   bool
	queueStarted     bool
	queueExtraErrors int

	lastProgressEmit time.Time
}

// NewConvertService 创建转换服务，store 由外部注入；订阅设置变更并推送状态。
// Wails 在退出时调用 ServiceShutdown 停止订阅。
func NewConvertService(store *settingstore.Store) *ConvertService {
	lifecycle, stopLifecycle := context.WithCancel(context.Background())
	s := &ConvertService{
		store: store,
		files: nil,
		job: JobState{
			Status:  JobStatusIdle,
			Message: idleMessage,
		},
		revision:      1,
		done:          make(chan struct{}),
		watchDone:     make(chan struct{}),
		lifecycle:     lifecycle,
		stopLifecycle: stopLifecycle,
	}
	go s.watchSettings()
	return s
}

// lifecycleContext returns the context that ServiceShutdown cancels.
func (s *ConvertService) lifecycleContext() context.Context {
	if s.lifecycle == nil {
		return context.Background()
	}
	return s.lifecycle
}

func (s *ConvertService) algoRegistry(ctx context.Context, settings *protocol.Settings) algoRegistry {
	s.mu.Lock()
	fn := s.decryptAlgos
	s.mu.Unlock()
	if fn != nil {
		return buildAlgoRegistry(fn(ctx, settings))
	}
	return newAlgoRegistry(ctx, settings)
}

func (s *ConvertService) setDecryptAlgos(fn func(context.Context, *protocol.Settings) []protocol.Algo) {
	s.mu.Lock()
	s.decryptAlgos = fn
	s.mu.Unlock()
}

func init() {
	application.RegisterEvent[AppSnapshot]("convert:state")
}

func (s *ConvertService) watchSettings() {
	defer close(s.watchDone)
	changes := s.store.Changes()
	for {
		select {
		case <-s.done:
			return
		case <-changes:
			s.PublishState()
		}
	}
}

// ServiceShutdown 取消进行中的转换与入队探测，并停止设置订阅。Wails 在应用退出时调用；
// 该生命周期方法不会生成前端绑定。可重复调用。
func (s *ConvertService) ServiceShutdown() error {
	s.closeOnce.Do(func() {
		s.mu.Lock()
		s.shuttingDown = true
		if s.cancel != nil {
			s.cancel()
		}
		s.mu.Unlock()
		if s.stopLifecycle != nil {
			s.stopLifecycle()
		}
		if s.done != nil {
			close(s.done)
		}
		s.probeWG.Wait()
	})
	return nil
}

// isRunningLocked reports whether a queue is active. s.cancel is set before the
// pre-flight work finishes, so it covers the window before job.Status flips.
func (s *ConvertService) isRunningLocked() bool {
	return s.cancel != nil || s.job.Status == JobStatusRunning
}

func (s *ConvertService) isQueueCancelled() bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.queueCancelled
}

func (s *ConvertService) summarizeJobLocked(files []*FileEntry, kind jobMessageKind, status string) JobState {
	total := len(files)
	ok, skip, fail, done := countFileStats(files)
	z := fail + s.queueExtraErrors
	percent := overallPercent(fileFractions(files))
	return JobState{
		Percent: percent,
		Status:  status,
		Message: formatJobMessage(kind, done, total, ok, skip, z),
		Current: done,
		Total:   total,
	}
}

func (s *ConvertService) reportFileProgress(files []*FileEntry, file *FileEntry, filePercent float64, forceEmit bool) {
	s.mu.Lock()
	if file != nil {
		if filePercent < 0 {
			filePercent = 0
		}
		if filePercent > 100 {
			filePercent = 100
		}
		file.Progress = filePercent
	}
	s.job = s.summarizeJobLocked(files, jobMsgRunning, JobStatusRunning)
	now := time.Now()
	shouldEmit := forceEmit || now.Sub(s.lastProgressEmit) >= progressEmitInterval
	var snap AppSnapshot
	if shouldEmit {
		s.lastProgressEmit = now
		snap = s.nextSnapshotLocked()
	}
	s.mu.Unlock()
	if shouldEmit {
		s.emitSnapshot(snap)
	}
}

func (s *ConvertService) snapshotLocked() AppSnapshot {
	files := make([]FileEntry, len(s.files))
	for i, file := range s.files {
		files[i] = *file
	}
	settingsState := s.store.SnapshotState()
	return AppSnapshot{
		Revision:         s.revision,
		SettingsRevision: settingsState.Revision,
		Files:            files,
		Settings:         settingsState.Settings,
		Profiles:         s.store.Profiles(),
		Job:              s.job,
	}
}

func (s *ConvertService) nextSnapshotLocked() AppSnapshot {
	s.revision++
	return s.snapshotLocked()
}

func (s *ConvertService) emitSnapshot(snap AppSnapshot) {
	if app := application.Get(); app != nil {
		app.Event.Emit("convert:state", snap)
	}
}

// PublishState 推送当前完整会话快照
func (s *ConvertService) PublishState() {
	s.mu.Lock()
	snap := s.nextSnapshotLocked()
	s.mu.Unlock()
	s.emitSnapshot(snap)
}

// GetState 返回当前完整会话快照
func (s *ConvertService) GetState() AppSnapshot {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.snapshotLocked()
}

// GetStatus 返回当前任务状态（兼容轮询）
func (s *ConvertService) GetStatus() JobState {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.job
}
