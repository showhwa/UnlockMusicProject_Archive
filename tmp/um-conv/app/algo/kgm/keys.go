package kgm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"git.um-react.app/um/um-conv/app/protocol"
	"github.com/ncruces/go-sqlite3"
)

type databaseInfo struct {
	Path      string `json:"path"`
	Encrypted bool   `json:"encrypted"`
}

func (a *Algo) loadKeys() (_ map[string]string, err error) {
	if err := a.ctx.Err(); err != nil {
		return nil, err
	}
	if a.settings == nil {
		return nil, errors.New("酷狗密钥库缺少配置")
	}
	configDir, err := os.UserConfigDir()
	if err != nil {
		return nil, fmt.Errorf("无法定位酷狗配置目录: %w", err)
	}
	dbPath := filepath.Join(configDir, "Kugou8", "KGMusicV3.db")
	result, err := a.run(a.ctx, a.settings.Binaries.UmCliRs, []string{"kgm", "-I", "--file-mode", "db", "--", dbPath})
	if ctxErr := a.ctx.Err(); ctxErr != nil {
		return nil, ctxErr
	}
	if result.Failed(err) {
		return nil, result.Error("无法探测酷狗数据库 "+dbPath, err)
	}
	var info databaseInfo
	if err := json.Unmarshal([]byte(result.Stdout), &info); err != nil {
		return nil, fmt.Errorf("无法解析酷狗数据库 %s 的探测结果: %w", dbPath, err)
	}
	readPath := dbPath
	if info.Encrypted {
		file, createErr := os.CreateTemp(protocol.ResolveTempDir(a.settings), "um-conv-kgm-*.db")
		if createErr != nil {
			return nil, fmt.Errorf("无法创建酷狗临时数据库: %w", createErr)
		}
		readPath = file.Name()
		defer func() {
			if cleanupErr := os.Remove(readPath); cleanupErr != nil && !errors.Is(cleanupErr, os.ErrNotExist) {
				err = errors.Join(err, fmt.Errorf("无法清理酷狗临时数据库: %w", cleanupErr))
			}
		}()
		if err := file.Close(); err != nil {
			return nil, fmt.Errorf("无法关闭酷狗临时数据库文件: %w", err)
		}

		result, err := a.run(a.ctx, a.settings.Binaries.UmCliRs, []string{
			"kgm", "--file-mode", "db", "--output", readPath, "--", dbPath,
		})
		if ctxErr := a.ctx.Err(); ctxErr != nil {
			return nil, ctxErr
		}
		if result.Failed(err) {
			return nil, result.Error("无法解密酷狗数据库 "+dbPath, err)
		}
	}
	keys, err := readKeys(a.ctx, readPath)
	if err != nil {
		return nil, fmt.Errorf("无法读取酷狗数据库 %s 中的音频密钥: %w", dbPath, err)
	}
	return keys, nil
}

func readKeys(ctx context.Context, path string) (_ map[string]string, err error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	db, err := sqlite3.OpenFlags(path, sqlite3.OPEN_READONLY)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := db.Close(); closeErr != nil {
			err = errors.Join(err, closeErr)
		}
	}()
	db.SetInterrupt(ctx)
	stmt, _, err := db.Prepare(`
		SELECT EncryptionKeyId, EncryptionKey
		FROM ShareFileItems
		WHERE EncryptionKey IS NOT NULL AND EncryptionKey != ''
	`)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := stmt.Close(); closeErr != nil {
			err = errors.Join(err, closeErr)
		}
	}()

	keys := make(map[string]string)
	for stmt.Step() {
		id := stmt.ColumnText(0)
		if _, exists := keys[id]; !exists {
			keys[id] = stmt.ColumnText(1)
		}
	}
	if err := stmt.Err(); err != nil {
		return nil, err
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return keys, nil
}
