//go:build windows

package fileopen

import (
	"errors"
	"fmt"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	modshell32                     = windows.NewLazySystemDLL("shell32.dll")
	procILCreateFromPathW          = modshell32.NewProc("ILCreateFromPathW")
	procILFree                     = modshell32.NewProc("ILFree")
	procSHOpenFolderAndSelectItems = modshell32.NewProc("SHOpenFolderAndSelectItems")
)

var errInvalidPath = errors.New("fileopen: path contains NUL byte")

// windowsPathPtr 清理路径并转换为 UTF-16，拒绝含 NUL 字节的输入（不会 panic）。
func windowsPathPtr(absPath string) (*uint16, error) {
	if strings.IndexByte(absPath, 0) >= 0 {
		return nil, errInvalidPath
	}
	return windows.UTF16PtrFromString(filepath.Clean(filepath.FromSlash(absPath)))
}

// openPath 通过 ShellExecuteW 打开文件，不经过 cmd.exe，避免 & 等字符被解释。
func openPath(absPath string) error {
	target, err := windowsPathPtr(absPath)
	if err != nil {
		return err
	}
	verb, err := windows.UTF16PtrFromString("open")
	if err != nil {
		return err
	}
	return windows.ShellExecute(0, verb, target, nil, nil, windows.SW_SHOWNORMAL)
}

// createPIDL 将路径转换为 ITEMIDLIST；调用方须使用 ilFree 释放。
func createPIDL(path *uint16) (uintptr, error) {
	if err := procILCreateFromPathW.Find(); err != nil {
		return 0, err
	}
	pidl, _, callErr := procILCreateFromPathW.Call(uintptr(unsafe.Pointer(path)))
	if pidl == 0 {
		if callErr != nil && !errors.Is(callErr, windows.ERROR_SUCCESS) {
			return 0, fmt.Errorf("ILCreateFromPathW: %w", callErr)
		}
		return 0, errors.New("ILCreateFromPathW failed")
	}
	return pidl, nil
}

func ilFree(pidl uintptr) {
	if pidl != 0 {
		_, _, _ = procILFree.Call(pidl)
	}
}

// revealPath 通过 SHOpenFolderAndSelectItems 在资源管理器中选中文件，
// 完全绕开 explorer.exe 命令行解析，因此空格、&、逗号等字符均可正确处理。
func revealPath(absPath string) error {
	target, err := windowsPathPtr(absPath)
	if err != nil {
		return err
	}
	if err := procSHOpenFolderAndSelectItems.Find(); err != nil {
		return err
	}

	// COM 初始化与线程绑定，须在同一 OS 线程上配对调用 CoUninitialize。
	runtime.LockOSThread()
	defer runtime.UnlockOSThread()
	switch err := windows.CoInitializeEx(0, windows.COINIT_APARTMENTTHREADED|windows.COINIT_DISABLE_OLE1DDE); {
	case err == nil, errors.Is(err, syscall.Errno(windows.S_FALSE)):
		defer windows.CoUninitialize()
	case errors.Is(err, syscall.Errno(windows.RPC_E_CHANGED_MODE)):
		// 线程已以其他并发模型初始化 COM，可直接使用，且不应反初始化。
	default:
		return fmt.Errorf("CoInitializeEx: %w", err)
	}

	pidl, err := createPIDL(target)
	if err != nil {
		return err
	}
	defer ilFree(pidl)

	hr, _, _ := procSHOpenFolderAndSelectItems.Call(pidl, 0, 0, 0)
	if int32(hr) < 0 {
		return fmt.Errorf("SHOpenFolderAndSelectItems: %w", syscall.Errno(hr))
	}
	return nil
}
