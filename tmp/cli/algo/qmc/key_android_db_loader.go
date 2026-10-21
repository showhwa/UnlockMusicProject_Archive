package qmc

import (
	"database/sql"
	"fmt"
	"path/filepath"

	"git.um-react.app/um/cli/algo/common"
	"git.um-react.app/um/cli/internal/utils"
	"go.uber.org/zap"
	_ "modernc.org/sqlite"
)

// LoadAndroidDB loads QMC ekeys from a QQ Music Android SQLite DB
// (player_process_db). Soft-fails with a warning.
func LoadAndroidDB(path string, logger *zap.Logger) common.QMCKeys {
	if path == "" {
		return nil
	}
	logger.Debug("LoadAndroidDB: Loading Android DB", zap.String("path", path))

	keys, err := loadAndroidDB(path)
	if err != nil {
		logger.Warn("LoadAndroidDB: could not read Android DB keys", zap.Error(err))
		return nil
	}
	logger.Info("Using Android DB", zap.String("path", path), zap.Int("count", len(keys)))
	return keys
}

func loadAndroidDB(path string) (common.QMCKeys, error) {
	// mode=ro: refuse writes and do not create a missing database file.
	dsn := "file:" + filepath.ToSlash(path) + "?mode=ro"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping: %w", err)
	}

	query, err := androidEKeyQuery(db)
	if err != nil {
		return nil, err
	}

	rows, err := db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("query: %w", err)
	}
	defer rows.Close()

	result := make(common.QMCKeys)
	for rows.Next() {
		var filePath, ekey string
		if err := rows.Scan(&filePath, &ekey); err != nil {
			return nil, fmt.Errorf("scan: %w", err)
		}
		filePath = utils.NormalizeUnicode(filePath)
		ekey = utils.NormalizeUnicode(ekey)
		if filePath == "" || ekey == "" {
			continue
		}
		result[filePath] = ekey
		if base := filepath.Base(filePath); base != filePath {
			result[utils.NormalizeUnicode(base)] = ekey
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows: %w", err)
	}
	return result, nil
}

func androidEKeyQuery(db *sql.DB) (string, error) {
	has, err := hasTable(db, "audio_file_ekey_table")
	if err != nil {
		return "", err
	}
	if has {
		return "select file_path, ekey from audio_file_ekey_table", nil
	}

	has, err = hasTable(db, "EKeyFileInfo")
	if err != nil {
		return "", err
	}
	if has {
		return "select filePath, eKey from EKeyFileInfo", nil
	}

	return "", fmt.Errorf("no known ekey table found (audio_file_ekey_table or EKeyFileInfo)")
}

func hasTable(db *sql.DB, name string) (bool, error) {
	var found string
	err := db.QueryRow(
		`select name from sqlite_master where type='table' and name=?`,
		name,
	).Scan(&found)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("hasTable(%s): %w", name, err)
	}
	return true, nil
}
