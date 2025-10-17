package qmmac

import (
	"crypto/md5"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/internal/mmkv"
	"go.uber.org/zap"
)

var _RE_UDID_V10 = regexp.MustCompile(`_\x10\(([0-9a-f]{40})`)

type QQMusicMacV10 struct {
	logger   *zap.Logger
	mmkv_dir string
}

func (q *QQMusicMacV10) extractUdids(data []byte) ([]string, error) {
	var result []string
	for _, match := range _RE_UDID_V10.FindAllSubmatch(data, -1) {
		udid := string(match[1])
		q.logger.Debug("extractUdids: found udid", zap.String("udid", udid))
		result = append(result, udid)
	}
	return result, nil
}

func (q *QQMusicMacV10) caesar(text string, shift int) string {
	var result strings.Builder

	for _, char := range []byte(text) {
		var transformed byte
		if 'A' <= char && char <= 'Z' {
			transformed = (char-'A'+byte(shift))%26 + 'A'
		} else if 'a' <= char && char <= 'z' {
			transformed = (char-'a'+byte(shift))%26 + 'a'
		} else if '0' <= char && char <= '9' {
			transformed = (char-'0'+byte(shift))%10 + '0'
		} else {
			transformed = char
		}
		result.WriteByte(transformed)
	}

	return result.String()
}

func (q *QQMusicMacV10) mmkv(udid string, id int) (path string, key string, err error) {
	str1 := q.caesar(udid, id+3)
	int1, err := strconv.ParseInt(udid[5:7], 16, 32)
	if err != nil {
		return "", "", fmt.Errorf("getMmkv: could not parse udid: %w", err)
	}
	int2 := 5 + (int(int1)+id)%4
	name := str1[:int2]
	path = filepath.Join(q.mmkv_dir, name)

	int3 := id + 0xa546
	str3 := fmt.Sprintf("%s%04x", udid, int3)
	hash := md5.Sum([]byte(str3))
	key = fmt.Sprintf("%x", hash)[:16]

	return path, key, nil
}

func (q *QQMusicMacV10) loadByPList(plist_path string) ([]common.QMCKeys, error) {
	logger := q.logger.With(zap.String("plist", plist_path))
	logger.Debug("loadMacKeysV10: load key from plist")
	if f, err := os.Stat(plist_path); err != nil || f.IsDir() {
		logger.Debug("loadMacKeysV10: plist not found")
		return nil, nil
	}
	plist_data, err := os.ReadFile(plist_path)
	if err != nil {
		logger.Warn("loadMacKeysV10: could not read plist", zap.Error(err))
		return nil, fmt.Errorf("loadMacKeysV10: could not read plist: %w", err)
	}
	udids, err := q.extractUdids(plist_data)
	if err != nil {
		logger.Warn("loadMacKeysV10: could not extract udid", zap.Error(err))
		return nil, fmt.Errorf("loadMacKeysV10: could not extract udid: %w", err)
	}
	logger.Debug("loadMacKeysV10: read udid", zap.Strings("udids", udids))

	var keysList []common.QMCKeys
	for _, udid := range udids {
		keys, err := q.loadByUDID(udid, logger)
		if err != nil {
			logger.Warn("loadMacKeysV10: could not load by udid", zap.String("udid", udid), zap.Error(err))
			continue
		}
		keysList = append(keysList, keys)
	}
	return keysList, nil
}
func (q *QQMusicMacV10) loadByUDID(udid string, logger *zap.Logger) (common.QMCKeys, error) {
	mmkv_path, mmkv_key, err := q.mmkv(udid, 1)
	if err != nil {
		logger.Warn("loadMacKeysV10: could not get mmkv name/key", zap.Error(err))
		return nil, fmt.Errorf("loadMacKeysV10: could not get mmkv name/key: %w", err)
	}
	logger.Info("Using QQMusic 10.x mmkv", zap.String("mmkv", mmkv_path))
	keys, err := mmkv.LoadFromPath(mmkv_path, mmkv_key, logger)
	if err != nil {
		logger.Warn("loadMacKeysV10: could not load mmkv", zap.String("mmkv", mmkv_path), zap.Error(err))
		return nil, fmt.Errorf("loadMacKeysV10: could not load mmkv: %w", err)
	}
	return keys, nil
}

func LoadMacKeysV10(logger *zap.Logger) (common.QMCKeys, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		logger.Warn("Failed to get home dir")
		return nil, fmt.Errorf("loadMacKeysV10: failed to get home: %w", err)
	}

	// MMKV dir is always inside the sandbox container
	mmkv_dir := filepath.Join(
		homeDir,
		"Library/Containers/com.tencent.QQMusicMac/Data/",
		"Library/Application Support/QQMusicMac/iData",
	)
	if f, err := os.Stat(mmkv_dir); err != nil || !f.IsDir() {
		logger.Debug("loadMacKeysV10: mmkv dir not found", zap.String("mmkv_dir", mmkv_dir))
		return nil, nil
	}

	// without sandbox
	plist_without_sandbox := filepath.Join(
		homeDir,
		"Library/Preferences/com.tencent.QQMusicMac.plist",
	)

	// with sandbox (e.g. from App Store)
	plist_sandboxed := filepath.Join(
		homeDir,
		"Library/Containers/com.tencent.QQMusicMac/Data/",
		"Library/Preferences/com.tencent.QQMusicMac.plist",
	)

	q := QQMusicMacV10{
		logger:   logger,
		mmkv_dir: mmkv_dir,
	}

	keys1, err := q.loadByPList(plist_without_sandbox)
	if err != nil {
		return nil, err
	}
	keys2, err := q.loadByPList(plist_sandboxed)
	if err != nil {
		return nil, err
	}

	return mmkv.Merge(append(keys1, keys2...)...), nil
}
