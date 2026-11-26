package settingstore

import (
	"encoding/json"
	"fmt"

	"git.um-react.app/um/um-conv/app/protocol"

	jsonpatch "github.com/evanphx/json-patch/v5"
)

func prepareSettings(next protocol.Settings, knownFormats map[string]struct{}) (protocol.Settings, error) {
	protocol.NormalizeSettings(&next)
	if err := protocol.ValidateSettings(next, knownFormats); err != nil {
		return protocol.Settings{}, err
	}
	return next, nil
}

// mergeSettingsPatch applies an RFC 7396 JSON Merge Patch onto current settings.
func mergeSettingsPatch(current protocol.Settings, patch map[string]any, knownFormats map[string]struct{}) (protocol.Settings, error) {
	patchBytes, err := json.Marshal(patch)
	if err != nil {
		return protocol.Settings{}, fmt.Errorf("序列化设置补丁失败: %w", err)
	}
	base, err := json.Marshal(current)
	if err != nil {
		return protocol.Settings{}, fmt.Errorf("序列化当前设置失败: %w", err)
	}
	merged, err := jsonpatch.MergePatch(base, patchBytes)
	if err != nil {
		return protocol.Settings{}, fmt.Errorf("合并设置失败: %w", err)
	}
	var next protocol.Settings
	if err := json.Unmarshal(merged, &next); err != nil {
		return protocol.Settings{}, fmt.Errorf("解析合并后的设置失败: %w", err)
	}
	return prepareSettings(next, knownFormats)
}
