package convert

import (
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
)

func (s *ConvertService) appendFilesLocked(entries []FileEntry) (bool, []*FileEntry) {
	if len(entries) == 0 {
		return false, nil
	}
	known := make(map[string]struct{}, len(s.files))
	for _, f := range s.files {
		known[f.Path] = struct{}{}
	}
	var added []*FileEntry
	changed := false
	for _, item := range entries {
		if item.Path == "" {
			continue
		}
		if _, ok := known[item.Path]; ok {
			continue
		}
		known[item.Path] = struct{}{}
		item.Status = FileStatusPending
		s.files = append(s.files, &item)
		added = append(added, s.files[len(s.files)-1])
		changed = true
	}
	return changed, added
}

func collectMediaUnderDir(dir string) ([]FileEntry, error) {
	var entries []FileEntry
	err := filepath.WalkDir(dir, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return nil
		}
		if d.IsDir() {
			return nil
		}
		if !isMediaFile(path) {
			return nil
		}
		entries = append(entries, fileEntryFromPath(path))
		return nil
	})
	return entries, err
}

func entriesFromPaths(paths []string) ([]FileEntry, error) {
	var entries []FileEntry
	for _, p := range paths {
		if p == "" {
			continue
		}
		info, err := os.Stat(p)
		if err != nil {
			continue
		}
		if info.IsDir() {
			under, err := collectMediaUnderDir(p)
			if err != nil {
				return nil, err
			}
			entries = append(entries, under...)
			continue
		}
		entries = append(entries, fileEntryFromPath(p))
	}
	return entries, nil
}

func (s *ConvertService) ingestEntries(entries []FileEntry) {
	s.mu.Lock()
	changed, added := s.appendFilesLocked(entries)
	var snap AppSnapshot
	var probeTargets []*FileEntry
	if changed {
		for _, file := range added {
			if file.Source.Player == "" {
				probeTargets = append(probeTargets, file)
			}
		}
		snap = s.nextSnapshotLocked()
	}
	s.mu.Unlock()
	if changed {
		s.emitSnapshot(snap)
		s.scheduleSourceProbes(probeTargets)
	}
}

// AddPaths 将本地路径并入队列：普通文件直接加入，目录则递归收集媒体文件。
func (s *ConvertService) AddPaths(paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	entries, err := entriesFromPaths(paths)
	if err != nil {
		return err
	}
	s.ingestEntries(entries)
	return nil
}

// SelectFiles 打开原生多选文件对话框，将选中项并入队列。取消时无变更。
func (s *ConvertService) SelectFiles() error {
	paths, err := application.Get().Dialog.OpenFile().
		SetTitle("添加文件").
		CanChooseFiles(true).
		AddFilter("支持的文件 ", inputFilterGlob()).
		AddFilter("所有文件 ", "*.*").
		PromptForMultipleSelection()
	if dialogCancelled(err) {
		return nil
	}
	if err != nil {
		return err
	}

	entries := make([]FileEntry, 0, len(paths))
	for _, p := range paths {
		if p == "" {
			continue
		}
		entries = append(entries, fileEntryFromPath(p))
	}
	s.ingestEntries(entries)
	return nil
}

// SelectFolder 选择目录并递归收集其中的音视频文件，并入队列。取消时无变更。
func (s *ConvertService) SelectFolder() error {
	dir, err := pickDirectory("添加目录")
	if err != nil {
		return err
	}
	if dir == "" {
		return nil
	}

	entries, err := collectMediaUnderDir(dir)
	if err != nil {
		return err
	}
	s.ingestEntries(entries)
	return nil
}

// RemoveFiles 按路径从队列移除
func (s *ConvertService) RemoveFiles(paths []string) error {
	if len(paths) == 0 {
		return nil
	}
	drop := make(map[string]struct{}, len(paths))
	for _, p := range paths {
		if p == "" {
			continue
		}
		drop[p] = struct{}{}
	}
	if len(drop) == 0 {
		return nil
	}

	s.mu.Lock()
	if s.isRunningLocked() {
		s.mu.Unlock()
		return fmt.Errorf("转换进行中，无法删除")
	}
	next := make([]*FileEntry, 0, len(s.files))
	changed := false
	for _, f := range s.files {
		if _, ok := drop[f.Path]; ok {
			changed = true
			continue
		}
		next = append(next, f)
	}
	var snap AppSnapshot
	if changed {
		s.files = next
		snap = s.nextSnapshotLocked()
	}
	s.mu.Unlock()
	if changed {
		s.emitSnapshot(snap)
	}
	return nil
}

// ClearFiles 清空文件队列；转换进行中返回错误
func (s *ConvertService) ClearFiles() error {
	s.mu.Lock()
	if s.isRunningLocked() {
		s.mu.Unlock()
		return fmt.Errorf("转换进行中，无法清空")
	}
	if len(s.files) == 0 {
		s.mu.Unlock()
		return nil
	}
	s.files = nil
	snap := s.nextSnapshotLocked()
	s.mu.Unlock()
	s.emitSnapshot(snap)
	return nil
}

// mutateFileEntry applies mutate to file while it is still in the queue and
// publishes a snapshot. A removed and re-added path is a different entry, so
// matching is by pointer. It reports whether the entry was found.
func (s *ConvertService) mutateFileEntry(file *FileEntry, mutate func(*FileEntry)) bool {
	s.mu.Lock()
	if !slices.Contains(s.files, file) {
		s.mu.Unlock()
		return false
	}
	mutate(file)
	snap := s.nextSnapshotLocked()
	s.mu.Unlock()
	s.emitSnapshot(snap)
	return true
}

func applyFileResult(entry *FileEntry, result fileResult) {
	entry.Status = result.status
	entry.OutputPath = result.outputPath
	entry.Error = result.errMessage
	switch result.status {
	case FileStatusSuccess:
		entry.Output = result.output
		entry.Progress = 100
		entry.Error = ""
	case FileStatusSkipped:
		entry.Progress = 100
		entry.Error = ""
	case FileStatusFailed:
		if entry.Progress == 0 {
			entry.Progress = 100
		}
	}
}

func (s *ConvertService) recordResult(file *FileEntry, result fileResult) {
	s.mutateFileEntry(file, func(entry *FileEntry) {
		applyFileResult(entry, result)
	})
}

// recordFileCompletion updates the file entry, any extra error counter, and
// the running job summary in a single lock acquisition and snapshot emission.
func (s *ConvertService) recordFileCompletion(runFiles []*FileEntry, file *FileEntry, result fileResult, extraError bool) {
	s.mu.Lock()
	if extraError {
		s.queueExtraErrors++
	}
	if slices.Contains(s.files, file) {
		applyFileResult(file, result)
	}
	s.job = s.summarizeJobLocked(runFiles, jobMsgRunning, JobStatusRunning)
	s.lastProgressEmit = time.Now()
	snap := s.nextSnapshotLocked()
	s.mu.Unlock()
	s.emitSnapshot(snap)
}

func fileEntryFromPath(p string) FileEntry {
	entry := FileEntry{
		Name: filepath.Base(p),
		Path: p,
		Size: "—",
	}
	if player := playerForPath(p); player != "" {
		entry.Source.Player = player
	}
	if info, err := os.Stat(p); err == nil {
		entry.Size = formatByteSize(info.Size())
	}
	return entry
}

func formatByteSize(n int64) string {
	const (
		kb = 1024
		mb = 1024 * kb
		gb = 1024 * mb
	)
	switch {
	case n >= gb:
		return fmt.Sprintf("%.1f GB", float64(n)/float64(gb))
	case n >= mb:
		return fmt.Sprintf("%.1f MB", float64(n)/float64(mb))
	case n >= kb:
		return fmt.Sprintf("%.1f KB", float64(n)/float64(kb))
	default:
		return fmt.Sprintf("%d B", n)
	}
}
