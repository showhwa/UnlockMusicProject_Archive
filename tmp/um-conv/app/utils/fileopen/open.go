package fileopen

import "path/filepath"

// Open 使用系统默认程序打开文件或目录。
func Open(targetPath string) error {
	absPath, err := filepath.Abs(targetPath)
	if err != nil {
		return err
	}
	return openPath(absPath)
}

// Reveal 在系统文件管理器中打开所在目录并选中该文件。
func Reveal(targetPath string) error {
	absPath, err := filepath.Abs(targetPath)
	if err != nil {
		return err
	}
	return revealPath(absPath)
}
