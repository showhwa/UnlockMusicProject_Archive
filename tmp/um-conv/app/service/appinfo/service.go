package appinfo

import "git.um-react.app/um/um-conv/app/protocol"

const (
	appName    = "音乐解锁 - 音频转换器"
	projectURL = "https://git.cam.jixun.dev/music-tool/um-conv"
)

// AppInfoService exposes immutable application build metadata to the frontend.
type AppInfoService struct {
	info protocol.AppInfo
}

func NewAppInfoService(version, commit string, inputFormats []protocol.InputFormatGroup) *AppInfoService {
	return &AppInfoService{info: protocol.AppInfo{
		Name:         appName,
		Version:      version,
		Commit:       commit,
		ProjectURL:   projectURL,
		InputFormats: cloneInputFormats(inputFormats),
	}}
}

func (s *AppInfoService) GetAppInfo() protocol.AppInfo {
	info := s.info
	info.InputFormats = cloneInputFormats(s.info.InputFormats)
	return info
}

func cloneInputFormats(groups []protocol.InputFormatGroup) []protocol.InputFormatGroup {
	cloned := make([]protocol.InputFormatGroup, len(groups))
	for i, group := range groups {
		cloned[i] = group
		cloned[i].Formats = append([]string(nil), group.Formats...)
	}
	return cloned
}
