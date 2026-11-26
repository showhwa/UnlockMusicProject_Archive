package ncm

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWriteFFMetadata(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name: "bare JSON and escaped values",
			input: `{
				"musicName":"歌名 = 第一首",
				"artist":[["歌手甲",1],["歌手乙",2]],
				"album":"专辑;精选#1",
				"year":2026
			}`,
			want: "title=歌名 \\= 第一首\nalbum=专辑\\;精选\\#1\ndate=2026\nartist=歌手甲/歌手乙\n",
		},
		{
			name:  "DJ program overrides",
			input: `dj:{"programName":"节目","djName":"主播","brand":"电台","mainMusic":{"musicName":"歌曲","artist":"歌手","album":"专辑"}}`,
			want:  "title=节目\nalbum=电台\nartist=主播\n",
		},
		{
			name:  "DJ falls back to the track",
			input: `dj:{"mainMusic":{"musicName":"歌曲","artist":"歌手","album":"专辑"}}`,
			want:  "title=歌曲\nalbum=专辑\nartist=歌手\n",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			testWriteFFMetadata(t, tt.input, ";FFMETADATA1\n"+tt.want)
		})
	}
}

func testWriteFFMetadata(t *testing.T, input, want string) {
	t.Helper()
	dir := t.TempDir()
	source := filepath.Join(dir, "metadata.json")
	dest := filepath.Join(dir, "metadata.txt")
	if err := os.WriteFile(source, []byte(input), 0o600); err != nil {
		t.Fatal(err)
	}

	if err := writeFFMetadata(source, dest); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(dest)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != want {
		t.Fatalf("metadata:\n%s\nwant:\n%s", got, want)
	}
}
