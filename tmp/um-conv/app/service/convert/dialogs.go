package convert

import (
	"errors"
	"runtime"
	"strings"

	"git.um-react.app/um/um-conv/app/utils/fileopen"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// dialogCancelMessage is the Windows file-dialog dismissal from Wails
// (cfd.ErrorCancelled). That sentinel lives in an internal package, so match
// the message. Cancelling a picker is an empty selection, not a failure.
const dialogCancelMessage = "cancelled by user"

func dialogCancelled(err error) bool {
	for err != nil {
		if err.Error() == dialogCancelMessage {
			return true
		}
		err = errors.Unwrap(err)
	}
	return false
}

func pickDirectory(title string) (string, error) {
	dir, err := application.Get().Dialog.OpenFile().
		SetTitle(title).
		CanChooseFiles(false).
		CanChooseDirectories(true).
		PromptForSingleSelection()
	if dialogCancelled(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(dir), nil
}

// SelectDirectory 选择输出目录。取消时返回空字符串。
func (s *ConvertService) SelectDirectory() (string, error) {
	return pickDirectory("选择输出目录")
}

// SelectExecutable 选择可执行文件。取消时返回空字符串。
func (s *ConvertService) SelectExecutable(title string) (string, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		title = "选择可执行文件"
	}
	dialog := application.Get().Dialog.OpenFile().
		SetTitle(title).
		CanChooseFiles(true).
		CanChooseDirectories(false)
	if runtime.GOOS == "windows" {
		dialog = dialog.AddFilter("可执行文件", "*.exe")
	}
	dialog = dialog.AddFilter("所有文件", "*.*")
	path, err := dialog.PromptForSingleSelection()
	if dialogCancelled(err) {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(path), nil
}

// PlayFile 用系统默认程序打开文件（播放音视频）。
func (s *ConvertService) PlayFile(path string) error {
	return fileopen.Open(path)
}

// OpenContainingFolder 在文件管理器中打开所在目录并选中该文件。
func (s *ConvertService) OpenContainingFolder(path string) error {
	return fileopen.Reveal(path)
}
