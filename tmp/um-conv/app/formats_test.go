package app

import (
	"reflect"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestSupportedFormatGroups(t *testing.T) {
	got := supportedFormatGroups()
	want := []protocol.InputFormatGroup{
		{Name: "媒体格式", Formats: []string{"aac", "flac", "m4a", "mkv", "mp3", "ogg", "wav", "webm", "wma"}},
		{Name: "网易云", Formats: []string{"ncm"}},
		{Name: "QQ 音乐", Formats: []string{"mgg*", "mflac*", "mmp4"}},
		{Name: "酷狗", Formats: []string{"kgm", "kgg", "kgma", "vpr"}},
		{Name: "酷我", Formats: []string{"kwm"}},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("supportedFormatGroups() = %#v, want %#v", got, want)
	}
}
