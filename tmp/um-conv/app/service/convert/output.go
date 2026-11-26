package convert

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"git.um-react.app/um/um-conv/app/protocol"
)

func resolveOutputDir(src string, settings protocol.Settings) (string, error) {
	switch settings.OutputTarget {
	case protocol.OutputTargetCustom:
		dir := strings.TrimSpace(settings.OutputDir)
		if dir == "" {
			return "", fmt.Errorf("自定义输出目录为空")
		}
		return dir, nil
	default:
		return filepath.Dir(src), nil
	}
}

type outputCandidate struct {
	path         string
	sameAsSource bool
	info         os.FileInfo
	statErr      error
}

// resolveBaseOutputCandidate computes the unsuffixed destination path and checks
// whether it points to the source file itself (by path/key or os.SameFile).
func resolveBaseOutputCandidate(src string, settings protocol.Settings, ext string) (outputCandidate, error) {
	dir, err := resolveOutputDir(src, settings)
	if err != nil {
		return outputCandidate{}, err
	}
	ext = strings.TrimPrefix(strings.TrimSpace(ext), ".")
	if ext == "" {
		return outputCandidate{}, fmt.Errorf("输出扩展名为空")
	}
	base := sourceStem(src)
	if base == "" {
		base = "output"
	}
	candidate := filepath.Join(dir, base+"."+ext)
	same := candidate == src || normalizeOutputKey(candidate) == normalizeOutputKey(src)
	var info os.FileInfo
	var statErr error
	if !same {
		info, statErr = os.Stat(candidate)
		if statErr == nil {
			if sourceInfo, err := os.Stat(src); err == nil && os.SameFile(info, sourceInfo) {
				same = true
			}
		}
	}
	return outputCandidate{
		path:         candidate,
		sameAsSource: same,
		info:         info,
		statErr:      statErr,
	}, nil
}

// resolveOutputPath builds dest path from source basename + ext.
// When ExistingOutputMode is skip and the candidate already exists (and is not src), skipped is true.
// A candidate referring to the source file always uses uniquePath.
func resolveOutputPath(src string, settings protocol.Settings, ext string) (path string, skipped bool, err error) {
	cand, err := resolveBaseOutputCandidate(src, settings, ext)
	if err != nil {
		return "", false, err
	}
	if cand.sameAsSource {
		return uniqueOutputPath(cand.path, src)
	}
	switch settings.ExistingOutputMode {
	case protocol.ExistingOutputSkip:
		if cand.statErr == nil {
			if !cand.info.Mode().IsRegular() {
				return "", false, fmt.Errorf("输出路径不是普通文件: %s", cand.path)
			}
			return cand.path, true, nil
		} else if !os.IsNotExist(cand.statErr) {
			return "", false, fmt.Errorf("检查输出文件失败: %w", cand.statErr)
		}
		return cand.path, false, nil
	case protocol.ExistingOutputOverwrite:
		if cand.statErr == nil {
			if !cand.info.Mode().IsRegular() {
				return "", false, fmt.Errorf("输出路径不是普通文件: %s", cand.path)
			}
		} else if !os.IsNotExist(cand.statErr) {
			return "", false, fmt.Errorf("检查输出文件失败: %w", cand.statErr)
		}
		return cand.path, false, nil
	default: // rename and unknown (should be repaired before convert)
		return uniqueOutputPath(cand.path, src)
	}
}

func uniqueOutputPath(candidate, src string) (string, bool, error) {
	path, err := uniquePath(candidate, src)
	return path, false, err
}

// sourceStem drops the longest encrypted suffix, so song.mflac0.flac becomes song.
// Plain media keeps filepath.Ext, so song.flac stays song.
func sourceStem(src string) string {
	base := filepath.Base(src)
	if enc, _ := longestSuffix(src, encryptedPlayerByExt); enc != "" {
		base = base[:len(base)-len(enc)]
	} else {
		base = strings.TrimSuffix(base, filepath.Ext(base))
	}
	if base == "" || base == "." || base == string(filepath.Separator) {
		return "output"
	}
	return base
}

// uniquePath returns path if unused and not equal to avoidSrc; otherwise path_1, path_2, ...
// A stat error other than "not exist" is returned instead of retried forever.
func uniquePath(path, avoidSrc string) (string, error) {
	if path != avoidSrc {
		_, err := os.Stat(path)
		if os.IsNotExist(err) {
			return path, nil
		}
		if err != nil {
			return "", fmt.Errorf("检查输出文件失败: %w", err)
		}
	}
	ext := filepath.Ext(path)
	stem := strings.TrimSuffix(path, ext)
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s_%d%s", stem, i, ext)
		if candidate == avoidSrc {
			continue
		}
		_, err := os.Stat(candidate)
		if os.IsNotExist(err) {
			return candidate, nil
		}
		if err != nil {
			return "", fmt.Errorf("检查输出文件失败: %w", err)
		}
	}
}

func copyFile(src, dest string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	out, err := os.OpenFile(dest, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	_, copyErr := io.Copy(out, in)
	if err := errors.Join(copyErr, out.Close()); err != nil {
		_ = os.Remove(dest)
		return err
	}
	return nil
}
