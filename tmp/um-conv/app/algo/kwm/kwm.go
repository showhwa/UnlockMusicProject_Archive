package kwm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils/decryptout"
)

type audioInfo struct {
	Magic      string `json:"magic"`
	Version    uint32 `json:"version"`
	ResourceID uint32 `json:"resourceId"`
	FormatName string `json:"formatName"`
}

type Algo struct {
	ctx      context.Context
	settings *protocol.Settings
	run      func(context.Context, string, []string) (cmd.CallResult, error)
	adbRun   func(context.Context, string, []string) (cmd.CallResult, error)
	adbKeys  func() (map[string]string, error)
}

var _ protocol.Algo = (*Algo)(nil)

// New creates a Kuwo KWM decryptor whose ADB key lookup is shared by one conversion batch.
func New(ctx context.Context, settings *protocol.Settings) *Algo {
	if ctx == nil {
		ctx = context.Background()
	}
	a := &Algo{ctx: ctx, settings: settings, run: cmd.CallCommandContext}
	a.adbKeys = sync.OnceValues(a.loadAdbKeys)
	return a
}

func (*Algo) GetSupportedExtensions() []string {
	// .mflac and .mgg overlap with QMC2. QMC2 is registered earlier, so its DeepProbe
	// claims them before kwm is asked. Disguised .flac stays out of this list and is
	// recognized by `um_cli_rs kuwo -I` instead.
	return []string{".kwm", ".mflac", ".mgg"}
}

func (a *Algo) DeepProbe(ctx context.Context, path string) (bool, error) {
	if err := ctx.Err(); err != nil {
		return false, err
	}
	if protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()) {
		return true, nil
	}
	// Only disguised .flac files are worth an um_cli_rs probe.
	if !protocol.MatchesAnyExtension(path, []string{".flac"}) {
		return false, nil
	}
	if a.run == nil || a.settings == nil || strings.TrimSpace(a.settings.Binaries.UmCliRs) == "" {
		return false, nil
	}

	if _, err := a.readAudioInfo(ctx, a.settings.Binaries.UmCliRs, path); err != nil {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return false, ctxErr
		}
		return false, nil
	}
	return true, nil
}

func (a *Algo) readAudioInfo(ctx context.Context, umCliRs, src string) (audioInfo, error) {
	result, err := a.run(ctx, umCliRs, []string{"kuwo", "-I", "--", src})
	if result.Failed(err) {
		if ctxErr := ctx.Err(); ctxErr != nil {
			return audioInfo{}, ctxErr
		}
		return audioInfo{}, result.Error("无法读取酷我音频信息", err)
	}
	var info audioInfo
	if err := json.Unmarshal([]byte(result.Stdout), &info); err != nil {
		return audioInfo{}, fmt.Errorf("无法解析酷我音频信息: %w", err)
	}
	return info, nil
}

func (*Algo) PopulateSupportedFormats(formats map[string][]string) {
	// Shared .mflac and .mgg suffixes stay on the QQ Music category.
	formats["酷我"] = []string{"kwm"}
}

// Decrypt uses settings for this call without changing the algorithm. ADB keys
// are shared by the batch, so they keep using the constructor settings.
func (a *Algo) Decrypt(src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	ctx := a.ctx
	if ctx == nil {
		ctx = context.Background()
	}
	activeSettings := protocol.ActiveSettings(a.settings, settings)
	if activeSettings == nil {
		return protocol.DecryptResult{}, errors.New("酷我解密缺少配置")
	}

	info, err := a.readAudioInfo(ctx, activeSettings.Binaries.UmCliRs, src)
	if err != nil {
		return protocol.DecryptResult{}, err
	}

	switch info.Version {
	case 1:
		err = a.decryptAudio(ctx, activeSettings.Binaries.UmCliRs, src, dest, "")
	case 2:
		if info.ResourceID == 0 || strings.TrimSpace(info.FormatName) == "" {
			return protocol.DecryptResult{}, errors.New("酷我 v2 音频信息缺少 resourceId 或 formatName")
		}
		key, keyErr := a.v2Key(info.ResourceID, info.FormatName)
		if keyErr != nil {
			return protocol.DecryptResult{}, keyErr
		}
		err = a.decryptAudio(ctx, activeSettings.Binaries.UmCliRs, src, dest, key)
	default:
		return protocol.DecryptResult{}, fmt.Errorf("不支持酷我加密版本 %d", info.Version)
	}
	if err != nil {
		return protocol.DecryptResult{}, err
	}

	if err := decryptout.Validate(dest); err != nil {
		return protocol.DecryptResult{}, err
	}
	return protocol.DecryptResult{AudioPath: dest}, nil
}

func (a *Algo) v2Key(resourceID uint32, formatName string) (string, error) {
	if a.settings == nil || !a.settings.Binaries.AllowAdbKeys {
		return "", errors.New("酷我 v2 加密格式需要允许使用 adb 从设备获取密钥")
	}
	keys, err := a.adbKeys()
	if err != nil {
		return "", err
	}
	lookupKey := deviceKey(resourceID, formatName)
	key, ok := keys[lookupKey]
	if !ok || key == "" {
		return "", fmt.Errorf("找不到酷我音频密钥 (%s)", lookupKey)
	}
	return key, nil
}

func (a *Algo) decryptAudio(ctx context.Context, umCliRs, src, dest, key string) error {
	args := []string{"kuwo", "--output", dest}
	if key != "" {
		args = append(args, "--ekey", key)
	}
	result, err := a.run(ctx, umCliRs, append(args, "--", src))
	if ctxErr := ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	if result.Failed(err) {
		return result.Error("酷我音频解密失败", err)
	}
	return nil
}
