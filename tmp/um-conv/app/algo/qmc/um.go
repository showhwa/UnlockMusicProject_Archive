package qmc

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"

	"git.um-react.app/um/um-conv/app/probe"
	"git.um-react.app/um/um-conv/app/protocol"
	"git.um-react.app/um/um-conv/app/utils/decryptout"
)

var errMissingSettings = errors.New("QQ 音乐解密缺少配置")

// GetMusicExEkeyByMediaFilename looks up a MusicEx ekey with the constructor settings.
func (a *QMPCAlgo) GetMusicExEkeyByMediaFilename(mediaFilename string, retries int) (string, error) {
	return a.musicExEkey(a.settings, mediaFilename, retries)
}

func (a *QMPCAlgo) musicExEkey(settings *protocol.Settings, mediaFilename string, retries int) (string, error) {
	if settings == nil {
		return "", errMissingSettings
	}
	mmkvPath, err := probe.ResolveExecutable(settings.Binaries.QmpcMmkvCli, "qmpc-mmkv-cli")
	if err != nil {
		return "", fmt.Errorf("MusicEx 文件未内嵌 ekey，且无法使用 qmpc-mmkv-cli 查询密钥: %w", err)
	}
	return a.getMusicExEkey(mmkvPath, mediaFilename, retries)
}

func (a *QMPCAlgo) getMusicExEkey(mmkvPath, mediaFilename string, retries int) (string, error) {
	a.ekeyMu.Lock()
	defer a.ekeyMu.Unlock()
	if err := a.ctx.Err(); err != nil {
		return "", err
	}
	for {
		result, err := a.run(a.ctx, mmkvPath, []string{"-o", "-", "-f", "plaintext", "-F", mediaFilename})
		if ctxErr := a.ctx.Err(); ctxErr != nil {
			return "", ctxErr
		}
		if !result.Failed(err) {
			keys := result.ExtractLinePairObject()
			if ekey, exists := keys[mediaFilename]; exists {
				return ekey, nil
			}
			return "", fmt.Errorf("umc_rs: ekey not found for media filename: %s", mediaFilename)
		}
		if result.ExitCode == 5 && retries > 0 {
			// CRC read error, read-on-write? retry.
			retries--
			continue
		}
		slog.Error("qmpc-mmkv-cli failed", "exit", result.ExitCode, "stdout", result.Stdout, "stderr", result.Stderr, "err", err)
		return "", result.Error("umc_rs: failed to call qmpc-mmkv-cli", err)
	}
}

func (a *QMPCAlgo) getEKey(settings *protocol.Settings, src string) (ekey string, err error) {
	if settings == nil {
		return "", errMissingSettings
	}
	result, err := a.run(a.ctx, settings.Binaries.UmCliRs, []string{"qmc2", "-I", "--", src})
	if ctxErr := a.ctx.Err(); ctxErr != nil {
		return "", ctxErr
	}
	if result.Failed(err) {
		slog.Error("um_cli_rs qmc2 -I failed", "src", src, "exit", result.ExitCode, "stdout", result.Stdout, "stderr", result.Stderr, "err", err)
		return ekey, result.Error("um_cli_rs: qmc2 -I failed", err)
	}

	var info QMPCInfoOutput
	if err = json.Unmarshal([]byte(result.Stdout), &info); err != nil {
		slog.Error("um_cli_rs qmc2 -I invalid JSON", "src", src, "stdout", result.Stdout, "stderr", result.Stderr, "err", err)
		return ekey, fmt.Errorf("umc_rs: failed to parse info JSON: %w\nstdout: %s\nstderr: %s", err, strings.TrimSpace(result.Stdout), strings.TrimSpace(result.Stderr))
	}

	switch info.MetadataType {
	case QMPCMetadataTypePCv1:
		if len(info.EKey) < 100 {
			slog.Error("PCv1 ekey missing or too short", "len", len(info.EKey), "src", src)
			return ekey, fmt.Errorf("umc_rs: PCv1 ekey missing or too short (len=%d, need >= 100)", len(info.EKey))
		}
		return info.EKey, nil
	case QMPCMetadataTypeMusicEx:
		if info.EKey != "" {
			return info.EKey, nil
		}
		return a.musicExEkey(settings, info.MusicexMediaFilename, 5)
	case QMPCMetadataTypeQTag:
		if info.EKey != "" {
			return info.EKey, nil
		}
		slog.Error("QMC2 file should contain ekey", "metadataType", info.MetadataType, "src", src)
		return ekey, fmt.Errorf("umc_rs: QMC2 file (type=%s) should contain ekey", info.MetadataType)
	case QMPCMetadataTypeSTag:
		// Batch ADB keys share a single sync.OnceValues cache built from
		// a.settings, so the toggle, adb path, and temp dir all read a.settings
		// (matching kgm.Algo).
		if a.settings == nil || !a.settings.Binaries.AllowAdbKeys {
			return "", fmt.Errorf("QMC2 STag 需要允许使用 adb 从设备获取密钥")
		}
		keys, keyErr := a.adbKeys()
		if keyErr != nil {
			return "", keyErr
		}
		name := filepath.Base(src)
		key, ok := keys[name]
		if !ok || key == "" {
			return "", fmt.Errorf("找不到文件 %s 的 ekey", name)
		}
		return key, nil
	}

	// Unknown type: still accept embedded ekey when present.
	if info.EKey != "" {
		return info.EKey, nil
	}

	slog.Error("unsupported metadata type", "metadataType", info.MetadataType, "src", src)
	return ekey, fmt.Errorf("umc_rs: unsupported metadata type: %s", info.MetadataType)
}

func (a *QMPCAlgo) decryptFileWithEKey(settings *protocol.Settings, src, dest, ekey string) error {
	if settings == nil {
		return errMissingSettings
	}
	result, err := a.run(a.ctx, settings.Binaries.UmCliRs, []string{"qmc2", "--ekey", ekey, "--output", dest, "--", src})
	if ctxErr := a.ctx.Err(); ctxErr != nil {
		return ctxErr
	}
	if result.Failed(err) {
		slog.Error("um_cli_rs decrypt failed", "src", src, "dest", dest, "exit", result.ExitCode, "stdout", result.Stdout, "stderr", result.Stderr, "err", err)
		return result.Error("umc_rs: failed to decrypt", err)
	}
	if err := decryptout.Validate(dest); err != nil {
		slog.Error("um_cli_rs produced invalid output", "src", src, "dest", dest, "err", err)
		return fmt.Errorf("umc_rs: invalid decrypted output: %w", err)
	}
	return nil
}
