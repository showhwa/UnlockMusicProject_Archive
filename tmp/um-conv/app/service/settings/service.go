package settings

import (
	"fmt"
	"os"

	"git.um-react.app/um/um-conv/app/logger"
	"git.um-react.app/um/um-conv/app/probe"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/settingstore"
	"git.um-react.app/um/um-conv/app/utils/fileopen"
)

// SettingsService is the Wails façade over settingstore.Store.
type SettingsService struct {
	store      *settingstore.Store
	openFile   func(string) error
	logPath    func() (string, error)
	syncLogger func() error
}

// NewSettingsService wraps an existing settings store for Wails.
func NewSettingsService(s *settingstore.Store) *SettingsService {
	return &SettingsService{
		store:      s,
		openFile:   fileopen.Open,
		logPath:    logger.Path,
		syncLogger: logger.Sync,
	}
}

// GetSettings 读取当前设置（Wails）
func (s *SettingsService) GetSettings() protocol.SettingsState {
	return s.store.SnapshotState()
}

// GetOutputProfiles 返回可选输出格式列表
func (s *SettingsService) GetOutputProfiles() []protocol.OutputProfile {
	return s.store.Profiles()
}

// SaveSettings 整包校验后落盘并通知变更
func (s *SettingsService) SaveSettings(next protocol.Settings) error {
	return s.store.Save(next)
}

// PatchSettings 用 RFC 7396 JSON Merge Patch 合并局部更新，校验后落盘并通知变更
func (s *SettingsService) PatchSettings(patch map[string]any) (protocol.SettingsState, error) {
	return s.store.PatchState(patch)
}

// ProbeExecutable 检测外部可执行文件是否可用，返回版本与能力信息（业务失败写在结果里，不返回 error）。
func (s *SettingsService) ProbeExecutable(req protocol.ProbeRequest) protocol.ProbeResult {
	return probe.Probe(req)
}

// OpenLogFile 刷新日志缓冲并使用系统默认程序打开日志文件。
func (s *SettingsService) OpenLogFile() error {
	if s.syncLogger != nil {
		_ = s.syncLogger()
	}
	path, err := s.logPath()
	if err != nil {
		return fmt.Errorf("获取日志文件路径失败: %w", err)
	}
	fi, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("日志文件不存在: %s", path)
		}
		return fmt.Errorf("无法访问日志文件: %w", err)
	}
	if fi.IsDir() {
		return fmt.Errorf("日志路径是目录: %s", path)
	}
	if err := s.openFile(path); err != nil {
		return fmt.Errorf("无法打开日志文件: %w", err)
	}
	return nil
}

// OpenConfigFile 确保配置文件存在并使用系统默认程序打开它。
func (s *SettingsService) OpenConfigFile() error {
	path, err := s.store.EnsureConfigFile()
	if err != nil {
		return fmt.Errorf("准备配置文件失败: %w", err)
	}
	if err := s.openFile(path); err != nil {
		return fmt.Errorf("无法打开配置文件: %w", err)
	}
	return nil
}
