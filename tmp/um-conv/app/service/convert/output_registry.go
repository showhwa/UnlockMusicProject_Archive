package convert

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"

	"git.um-react.app/um/um-conv/app/protocol"
)

type outputRegistry struct {
	mu       sync.Mutex
	reserved map[string]struct{}
}

func newOutputRegistry() *outputRegistry {
	return &outputRegistry{reserved: make(map[string]struct{})}
}

func normalizeOutputKey(path string) string {
	abs, err := filepath.Abs(path)
	if err != nil {
		abs = filepath.Clean(path)
	} else {
		abs = filepath.Clean(abs)
	}
	if runtime.GOOS == "windows" {
		abs = strings.ToLower(abs)
	}
	return abs
}

func (r *outputRegistry) reserve(src string, settings protocol.Settings, ext string) (path string, skipped bool, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	cand, err := resolveBaseOutputCandidate(src, settings, ext)
	if err != nil {
		return "", false, err
	}

	if cand.sameAsSource {
		chosen, err := uniquePathAvoiding(cand.path, src, r.reserved, true)
		if err != nil {
			return "", false, err
		}
		r.reserved[normalizeOutputKey(chosen)] = struct{}{}
		return chosen, false, nil
	}

	key := normalizeOutputKey(cand.path)
	_, held := r.reserved[key]

	switch settings.ExistingOutputMode {
	case protocol.ExistingOutputSkip:
		if cand.statErr == nil && !cand.info.Mode().IsRegular() {
			return "", false, fmt.Errorf("输出路径不是普通文件: %s", cand.path)
		}
		if cand.statErr != nil && !os.IsNotExist(cand.statErr) {
			return "", false, fmt.Errorf("检查输出文件失败: %w", cand.statErr)
		}
		if held || cand.statErr == nil {
			r.reserved[key] = struct{}{}
			return cand.path, true, nil
		}
		r.reserved[key] = struct{}{}
		return cand.path, false, nil

	case protocol.ExistingOutputOverwrite:
		if held {
			return "", false, fmt.Errorf("输出文件已被本会话中的其他任务写入: %s", cand.path)
		}
		if cand.statErr == nil && !cand.info.Mode().IsRegular() {
			return "", false, fmt.Errorf("输出路径不是普通文件: %s", cand.path)
		}
		if cand.statErr != nil && !os.IsNotExist(cand.statErr) {
			return "", false, fmt.Errorf("检查输出文件失败: %w", cand.statErr)
		}
		r.reserved[key] = struct{}{}
		return cand.path, false, nil

	default: // rename and unknown
		chosen, err := uniquePathAvoiding(cand.path, src, r.reserved, false)
		if err != nil {
			return "", false, err
		}
		r.reserved[normalizeOutputKey(chosen)] = struct{}{}
		return chosen, false, nil
	}
}

func (r *outputRegistry) unreserve(path string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.reserved, normalizeOutputKey(path))
}

func uniquePathAvoiding(path, avoidSrc string, taken map[string]struct{}, forceSuffix bool) (string, error) {
	avoidKey := ""
	if avoidSrc != "" {
		avoidKey = normalizeOutputKey(avoidSrc)
	}
	isAvoided := func(candidate, key string) bool {
		if avoidSrc == "" {
			return false
		}
		return candidate == avoidSrc || key == avoidKey
	}
	if !forceSuffix {
		key := normalizeOutputKey(path)
		if !isAvoided(path, key) {
			if _, ok := taken[key]; !ok {
				_, err := os.Stat(path)
				if os.IsNotExist(err) {
					return path, nil
				}
				if err != nil {
					return "", fmt.Errorf("检查输出文件失败: %w", err)
				}
			}
		}
	}
	ext := filepath.Ext(path)
	stem := strings.TrimSuffix(path, ext)
	for i := 1; ; i++ {
		candidate := fmt.Sprintf("%s_%d%s", stem, i, ext)
		key := normalizeOutputKey(candidate)
		if isAvoided(candidate, key) {
			continue
		}
		if _, ok := taken[key]; ok {
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
