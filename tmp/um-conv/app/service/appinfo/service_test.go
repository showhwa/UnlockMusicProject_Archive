package appinfo

import (
	"reflect"
	"testing"

	"git.um-react.app/um/um-conv/app/protocol"
)

func TestGetAppInfo(t *testing.T) {
	formats := []protocol.InputFormatGroup{{Name: "媒体格式", Formats: []string{"flac", "ncm"}}}
	service := NewAppInfoService("1.2.3", "abc123", formats)
	info := service.GetAppInfo()
	if info.Name != appName || info.Version != "1.2.3" || info.Commit != "abc123" || info.ProjectURL != projectURL {
		t.Fatalf("unexpected app info: %+v", info)
	}
	if !reflect.DeepEqual(info.InputFormats, formats) {
		t.Fatalf("unexpected input formats: %#v", info.InputFormats)
	}
	info.InputFormats[0].Name = "changed"
	info.InputFormats[0].Formats[0] = "changed"
	if got := service.GetAppInfo().InputFormats; !reflect.DeepEqual(got, formats) {
		t.Fatalf("service exposed mutable input formats: %#v", got)
	}
}
