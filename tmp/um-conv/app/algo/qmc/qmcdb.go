package qmc

import (
	"context"
	"errors"
	"path"
	"strings"

	"github.com/ncruces/go-sqlite3"
)

// ReadQQMusicDatabase reads filename → ekey rows from a QQ Music player database.
// audio_file_ekey_table is applied before EKeyFileInfo. An existing filename is kept.
// Missing tables are skipped. Paths are reduced to their Android base name.
func ReadQQMusicDatabase(ctx context.Context, dbPath string) (keys map[string]string, err error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	db, err := sqlite3.OpenFlags(dbPath, sqlite3.OPEN_READONLY)
	if err != nil {
		return nil, err
	}
	defer func() {
		if closeErr := db.Close(); closeErr != nil {
			err = errors.Join(err, closeErr)
		}
	}()
	db.SetInterrupt(ctx)

	keys = make(map[string]string)
	tables := []struct {
		name  string
		query string
	}{
		{name: "audio_file_ekey_table", query: `select file_path, ekey from audio_file_ekey_table`},
		{name: "EKeyFileInfo", query: `select filePath, eKey from EKeyFileInfo`},
	}
	for _, table := range tables {
		exists, existsErr := tableExists(db, table.name)
		if existsErr != nil {
			return nil, existsErr
		}
		if !exists {
			continue
		}
		if readErr := readEKeyTable(db, table.query, keys); readErr != nil {
			return nil, readErr
		}
	}
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	return keys, nil
}

func tableExists(db *sqlite3.Conn, name string) (exists bool, err error) {
	stmt, _, err := db.Prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`)
	if err != nil {
		return false, err
	}
	defer func() {
		if closeErr := stmt.Close(); closeErr != nil {
			err = errors.Join(err, closeErr)
		}
	}()
	if err = stmt.BindText(1, name); err != nil {
		return false, err
	}
	if stmt.Step() {
		return true, stmt.Err()
	}
	return false, stmt.Err()
}

func readEKeyTable(db *sqlite3.Conn, query string, keys map[string]string) (err error) {
	stmt, _, err := db.Prepare(query)
	if err != nil {
		return err
	}
	defer func() {
		if closeErr := stmt.Close(); closeErr != nil {
			err = errors.Join(err, closeErr)
		}
	}()
	for stmt.Step() {
		addQQMusicEKey(keys, stmt.ColumnText(0), stmt.ColumnText(1))
	}
	return stmt.Err()
}

func addQQMusicEKey(keys map[string]string, filePath, ekey string) {
	if ekey == "" {
		return
	}
	filePath = strings.ReplaceAll(filePath, `\`, "/")
	base := path.Base(filePath)
	if base == "" || base == "." || base == "/" {
		return
	}
	if _, exists := keys[base]; exists {
		return
	}
	keys[base] = ekey
}
