package kgm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"git.um-react.app/um/um-conv/app/cmd"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils/decryptout"
)

type audioInfo struct {
	Format        string  `json:"format"`
	CryptoVersion uint32  `json:"cryptoVersion"`
	OffsetToData  uint64  `json:"offsetToData"`
	KeySlot       int32   `json:"keySlot"`
	AudioHash     string  `json:"audioHash,omitempty"`
	EKey          *string `json:"ekey"`
}

type Algo struct {
	ctx      context.Context
	settings *protocol.Settings
	run      func(context.Context, string, []string) (cmd.CallResult, error)
	adbRun   func(context.Context, string, []string) (cmd.CallResult, error)
	keys     func() (map[string]string, error)
	adbKeys  func() (map[string]string, error)
}

var _ protocol.Algo = (*Algo)(nil)

// New creates a decryptor whose key lookup is shared by one conversion batch.
func New(ctx context.Context, settings *protocol.Settings) *Algo {
	a := &Algo{ctx: ctx, settings: settings, run: cmd.CallCommandContext}
	a.keys = sync.OnceValues(a.loadKeys)
	a.adbKeys = sync.OnceValues(a.loadAdbKeys)
	return a
}

func (*Algo) GetSupportedExtensions() []string {
	return []string{".kgm", ".vpr", ".kgg", ".kgma", ".kgg.flac", ".kgm.flac"}
}

func (a *Algo) DeepProbe(_ context.Context, path string) (bool, error) {
	return protocol.MatchesAnyExtension(path, a.GetSupportedExtensions()), nil
}

func (*Algo) PopulateSupportedFormats(formats map[string][]string) {
	// .kgm.flac and .kgg.flac stay registered for matching, and fold into kgm and kgg here.
	formats["酷狗"] = []string{"kgm", "kgg", "kgma", "vpr"}
}

// Decrypt uses settings for this call without changing the algorithm. Key databases
// are shared by the batch, so they keep using the constructor settings.
func (a *Algo) Decrypt(src, dest string, settings *protocol.Settings) (protocol.DecryptResult, error) {
	activeSettings := protocol.ActiveSettings(a.settings, settings)
	if activeSettings == nil {
		return protocol.DecryptResult{}, errors.New("酷狗解密缺少配置")
	}
	umCliRs := activeSettings.Binaries.UmCliRs
	result, err := a.run(a.ctx, umCliRs, []string{"kgm", "-I", "--", src})
	if result.Failed(err) {
		if a.ctx.Err() != nil {
			return protocol.DecryptResult{}, a.ctx.Err()
		}
		return protocol.DecryptResult{}, result.Error("无法读取酷狗音频信息", err)
	}

	var info audioInfo
	if err := json.Unmarshal([]byte(result.Stdout), &info); err != nil {
		return protocol.DecryptResult{}, fmt.Errorf("无法解析酷狗音频信息: %w", err)
	}

	switch info.CryptoVersion {
	case 2, 3:
		err = a.decryptAudio(umCliRs, src, dest, "")
	case 5:
		if info.AudioHash == "" {
			return protocol.DecryptResult{}, errors.New("酷狗 v5 音频信息缺少 audioHash")
		}
		key, keyErr := a.v5Key(info.AudioHash)
		if keyErr != nil {
			return protocol.DecryptResult{}, keyErr
		}
		err = a.decryptAudio(umCliRs, src, dest, key)
	default:
		return protocol.DecryptResult{}, fmt.Errorf("不支持酷狗加密版本 %d", info.CryptoVersion)
	}
	if err != nil {
		return protocol.DecryptResult{}, err
	}
	if err := decryptout.Validate(dest); err != nil {
		return protocol.DecryptResult{}, err
	}
	return protocol.DecryptResult{AudioPath: dest}, nil
}

func (a *Algo) v5Key(audioHash string) (string, error) {
	keys, keyErr := a.keys()
	if keyErr == nil {
		if key, ok := keys[audioHash]; ok {
			return key, nil
		}
	}
	if a.settings == nil || !a.settings.Binaries.AllowAdbKeys {
		if keyErr != nil {
			return "", keyErr
		}
		return "", fmt.Errorf("酷狗数据库中找不到音频密钥 (audioHash: %s)", audioHash)
	}

	deviceKeys, adbErr := a.adbKeys()
	if adbErr != nil {
		if keyErr != nil {
			return "", errors.Join(keyErr, adbErr)
		}
		return "", adbErr
	}
	if key, ok := deviceKeys[audioHash]; ok {
		return key, nil
	}
	if keyErr != nil {
		return "", keyErr
	}
	return "", fmt.Errorf("酷狗数据库中找不到音频密钥 (audioHash: %s)", audioHash)
}

func (a *Algo) decryptAudio(umCliRs, src, dest, key string) error {
	args := []string{"kgm", "--output", dest}
	if key != "" {
		args = append(args, "--ekey", key)
	}
	result, err := a.run(a.ctx, umCliRs, append(args, "--", src))
	if ctxErr := a.ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	if !result.Failed(err) {
		return nil
	}
	if key != "" {
		// The CLI has access to the key, so omit its command output from the error.
		return fmt.Errorf("酷狗 v5 音频解密失败 (um_cli_rs exit=%d)", result.ExitCode)
	}
	return result.Error("酷狗音频解密失败", err)
}
