// Package decryptout validates files produced by decryptors.
package decryptout

import (
	"fmt"
	"os"
)

// Validate reports an error unless path exists, is a regular file, and is non-empty.
func Validate(path string) error {
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("无法读取解密产物: %w", err)
	}
	if !info.Mode().IsRegular() {
		return fmt.Errorf("解密产物不是普通文件: %s", path)
	}
	if info.Size() == 0 {
		return fmt.Errorf("解密产物为空: %s", path)
	}
	return nil
}
