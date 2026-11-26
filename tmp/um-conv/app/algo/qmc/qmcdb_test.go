package qmc

import (
	"path/filepath"
	"testing"

	"github.com/ncruces/go-sqlite3"
)

func TestReadQQMusicDatabaseMergesFilenameAndKeepsFirstTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "player.db")
	db, err := sqlite3.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	err = db.Exec(`
		CREATE TABLE audio_file_ekey_table (file_path TEXT, ekey TEXT);
		CREATE TABLE EKeyFileInfo (filePath TEXT, eKey TEXT);
		INSERT INTO audio_file_ekey_table VALUES
			('/sdcard/Music/a.mflac', 'first'),
			('C:\Music\b.mflac', 'from-backslash'),
			('', 'empty-path'),
			('.', 'dot'),
			('/', 'slash'),
			('/sdcard/empty-key.mflac', '');
		INSERT INTO EKeyFileInfo VALUES
			('/sdcard/Music/a.mflac', 'second-should-lose'),
			('/sdcard/Download/c.mflac', 'third');
	`)
	if closeErr := db.Close(); err != nil || closeErr != nil {
		t.Fatalf("seed: %v, close: %v", err, closeErr)
	}

	keys, err := ReadQQMusicDatabase(t.Context(), path)
	if err != nil {
		t.Fatal(err)
	}
	want := map[string]string{
		"a.mflac": "first",
		"b.mflac": "from-backslash",
		"c.mflac": "third",
	}
	if len(keys) != len(want) {
		t.Fatalf("keys = %#v, want %#v", keys, want)
	}
	for name, ekey := range want {
		if keys[name] != ekey {
			t.Fatalf("keys[%q] = %q, want %q (all %#v)", name, keys[name], ekey, keys)
		}
	}
}

func TestReadQQMusicDatabaseSkipsMissingTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "player.db")
	db, err := sqlite3.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	err = db.Exec(`
		CREATE TABLE EKeyFileInfo (filePath TEXT, eKey TEXT);
		INSERT INTO EKeyFileInfo VALUES ('/sdcard/Music/only.mflac', 'only');
	`)
	if closeErr := db.Close(); err != nil || closeErr != nil {
		t.Fatalf("seed: %v, close: %v", err, closeErr)
	}

	keys, err := ReadQQMusicDatabase(t.Context(), path)
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 1 || keys["only.mflac"] != "only" {
		t.Fatalf("keys = %#v", keys)
	}
}

func TestReadQQMusicDatabaseNoTables(t *testing.T) {
	path := filepath.Join(t.TempDir(), "player.db")
	db, err := sqlite3.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	err = db.Exec(`CREATE TABLE unrelated (x TEXT);`)
	if closeErr := db.Close(); err != nil || closeErr != nil {
		t.Fatalf("seed: %v, close: %v", err, closeErr)
	}
	keys, err := ReadQQMusicDatabase(t.Context(), path)
	if err != nil {
		t.Fatal(err)
	}
	if len(keys) != 0 {
		t.Fatalf("keys = %#v", keys)
	}
}
