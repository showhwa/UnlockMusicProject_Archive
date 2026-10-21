package qmc

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"go.uber.org/zap"
)

func TestLoadAndroidDB_audioFileEkeyTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		create table audio_file_ekey_table (file_path text, ekey text);
		insert into audio_file_ekey_table values
			('/storage/emulated/0/Music/song.mflac', 'ekey1'),
			('plain.mgg', 'ekey2'),
			('', 'skip'),
			('empty-ekey.mflac', '');
	`)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()

	got := LoadAndroidDB(path, zap.NewNop())
	if got["/storage/emulated/0/Music/song.mflac"] != "ekey1" {
		t.Errorf("full path = %q", got["/storage/emulated/0/Music/song.mflac"])
	}
	if got["song.mflac"] != "ekey1" {
		t.Errorf("basename = %q, want ekey1", got["song.mflac"])
	}
	if got["plain.mgg"] != "ekey2" {
		t.Errorf("plain.mgg = %q", got["plain.mgg"])
	}
	if _, ok := got[""]; ok {
		t.Error("empty path should not be stored")
	}
	if _, ok := got["empty-ekey.mflac"]; ok {
		t.Error("empty ekey should not be stored")
	}
}

func TestLoadAndroidDB_EKeyFileInfo(t *testing.T) {
	path := filepath.Join(t.TempDir(), "db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		create table EKeyFileInfo (filePath text, eKey text);
		insert into EKeyFileInfo values
			('/data/data/com.tencent.qqmusic/files/a.mflac', 'KEYA');
	`)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()

	got := LoadAndroidDB(path, zap.NewNop())
	if got["/data/data/com.tencent.qqmusic/files/a.mflac"] != "KEYA" {
		t.Errorf("full path = %q", got["/data/data/com.tencent.qqmusic/files/a.mflac"])
	}
	if got["a.mflac"] != "KEYA" {
		t.Errorf("basename = %q, want KEYA", got["a.mflac"])
	}
}

func TestLoadAndroidDB_emptyPath(t *testing.T) {
	got := LoadAndroidDB("", zap.NewNop())
	if got != nil {
		t.Errorf("got %#v, want nil", got)
	}
}

func TestLoadAndroidDB_missingFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "no-such-db")
	got := LoadAndroidDB(path, zap.NewNop())
	if got != nil {
		t.Errorf("got %#v, want nil", got)
	}
	if _, err := os.Stat(path); err == nil {
		t.Error("missing db path should not be created")
	} else if !os.IsNotExist(err) {
		t.Fatalf("stat: %v", err)
	}
}

func TestLoadAndroidDB_noKnownTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`create table other (x text)`); err != nil {
		t.Fatal(err)
	}
	db.Close()

	got := LoadAndroidDB(path, zap.NewNop())
	if got != nil {
		t.Errorf("got %#v, want nil", got)
	}
}

func TestLoadAndroidDB_prefersAudioFileEkeyTable(t *testing.T) {
	path := filepath.Join(t.TempDir(), "db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = db.Exec(`
		create table audio_file_ekey_table (file_path text, ekey text);
		create table EKeyFileInfo (filePath text, eKey text);
		insert into audio_file_ekey_table values ('from-new.mflac', 'new');
		insert into EKeyFileInfo values ('from-old.mflac', 'old');
	`)
	if err != nil {
		t.Fatal(err)
	}
	db.Close()

	got := LoadAndroidDB(path, zap.NewNop())
	if got["from-new.mflac"] != "new" {
		t.Errorf("got %#v, want new table", got)
	}
	if _, ok := got["from-old.mflac"]; ok {
		t.Error("should prefer audio_file_ekey_table over EKeyFileInfo")
	}
}
