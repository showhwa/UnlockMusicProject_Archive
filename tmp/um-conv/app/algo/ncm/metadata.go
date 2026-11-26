package ncm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
)

var ncmMetadataKeys = []struct {
	jsonKey string
	ffKey   string
	djKey   string
}{
	{jsonKey: "musicName", ffKey: "title", djKey: "programName"},
	{jsonKey: "album", ffKey: "album", djKey: "brand"},
	{jsonKey: "albumArtist", ffKey: "album_artist"},
	{jsonKey: "genre", ffKey: "genre"},
	{jsonKey: "year", ffKey: "date"},
	{jsonKey: "track", ffKey: "track"},
}

func writeFFMetadata(jsonPath, dest string) error {
	raw, err := os.ReadFile(jsonPath)
	if err != nil {
		return fmt.Errorf("读取元信息文件: %w", err)
	}

	raw = bytes.TrimSpace(raw)
	metadataJSON, isDJ := bytes.CutPrefix(raw, []byte("dj:"))
	if !isDJ {
		metadataJSON, _ = bytes.CutPrefix(raw, []byte("music:"))
	}
	var metadata map[string]any
	if err := json.Unmarshal(metadataJSON, &metadata); err != nil {
		return fmt.Errorf("解析元信息 JSON: %w", err)
	}
	music := metadata
	mainMusic, hasMainMusic := metadata["mainMusic"].(map[string]any)
	isDJ = isDJ || hasMainMusic
	if isDJ {
		music = mainMusic
	}

	var b strings.Builder
	b.WriteString(";FFMETADATA1\n")
	for _, key := range ncmMetadataKeys {
		value := metadataScalar(music[key.jsonKey])
		if isDJ && key.djKey != "" {
			if override := metadataScalar(metadata[key.djKey]); override != "" {
				value = override
			}
		}
		if value != "" {
			fmt.Fprintf(&b, "%s=%s\n", key.ffKey, escapeFFMetadata(value))
		}
	}
	var artist string
	if isDJ {
		artist = metadataScalar(metadata["djName"])
	}
	if artist == "" {
		artist = metadataArtists(music["artist"])
	}
	if artist != "" {
		fmt.Fprintf(&b, "artist=%s\n", escapeFFMetadata(artist))
	}

	if err := os.WriteFile(dest, []byte(b.String()), 0o600); err != nil {
		_ = os.Remove(dest)
		return fmt.Errorf("写入 ffmetadata 文件: %w", err)
	}
	return nil
}

func metadataScalar(value any) string {
	switch value := value.(type) {
	case string:
		return strings.TrimSpace(value)
	case json.Number:
		return value.String()
	case float64:
		return strconv.FormatFloat(value, 'f', -1, 64)
	default:
		return ""
	}
}

func metadataArtists(value any) string {
	items, ok := value.([]any)
	if !ok {
		return metadataScalar(value)
	}

	artists := make([]string, 0, len(items))
	for _, item := range items {
		if pair, ok := item.([]any); ok && len(pair) > 0 {
			item = pair[0]
		}
		if artist := metadataScalar(item); artist != "" {
			artists = append(artists, artist)
		}
	}
	return strings.Join(artists, "/")
}

func escapeFFMetadata(value string) string {
	replacer := strings.NewReplacer(
		"\\", "\\\\",
		"=", "\\=",
		";", "\\;",
		"#", "\\#",
		"\r\n", "\\\n",
		"\r", "\\\n",
		"\n", "\\\n",
	)
	return replacer.Replace(value)
}
