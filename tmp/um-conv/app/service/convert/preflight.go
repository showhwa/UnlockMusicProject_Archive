package convert

import (
	"context"
	"fmt"
	"strings"

	"git.um-react.app/um/um-conv/app/probe"
	"git.um-react.app/um/um-conv/app/protocol"
)

func (s *ConvertService) findProfile(id string) (*protocol.OutputProfile, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return nil, fmt.Errorf("未选择输出格式")
	}
	for _, p := range s.store.Profiles() {
		if p.ID == id {
			cp := p
			return &cp, nil
		}
	}
	return nil, fmt.Errorf("未知输出格式: %s", id)
}

// prepareSettingsForConvert resolves binary paths into a settings copy used by the pipeline.
func prepareSettingsForConvert(settings protocol.Settings, needDecryptTools bool) (protocol.Settings, error) {
	ffmpegPath, err := probe.ResolveExecutable(settings.FFmpeg.Path, "ffmpeg")
	if err != nil {
		return settings, fmt.Errorf("未找到 ffmpeg: %w", err)
	}
	settings.FFmpeg.Path = ffmpegPath

	if needDecryptTools {
		umPath, err := probe.ResolveExecutable(settings.Binaries.UmCliRs, probe.UmCliRsName)
		if err != nil {
			return settings, fmt.Errorf("未找到 um_cli_rs: %w", err)
		}
		settings.Binaries.UmCliRs = umPath
	}

	if settings.OutputTarget == protocol.OutputTargetCustom && strings.TrimSpace(settings.OutputDir) == "" {
		return settings, fmt.Errorf("请先设置输出目录")
	}
	return settings, nil
}

func isUnlabeledFlac(path string) bool {
	return playerForPath(path) == "" && protocol.MatchesAnyExtension(path, []string{".flac"})
}

func hasUnlabeledFlac(paths []string) bool {
	for _, path := range paths {
		if isUnlabeledFlac(path) {
			return true
		}
	}
	return false
}

func settingsWithResolvedUmCliRs(settings protocol.Settings) protocol.Settings {
	path, err := probe.ResolveExecutable(settings.Binaries.UmCliRs, probe.UmCliRsName)
	if err != nil {
		settings.Binaries.UmCliRs = ""
		return settings
	}
	settings.Binaries.UmCliRs = path
	return settings
}

// queuePreflight is the outcome of queueNeedsDecrypt.
type queuePreflight struct {
	// needDecrypt reports whether the queue may need um_cli_rs.
	needDecrypt bool
	// claims maps each DeepProbed path to the registry position of the
	// decryptor that claimed it, or -1 when none did. runQueue reuses it so a
	// file is probed at most once per run.
	claims map[string]int
}

// queueNeedsDecrypt is a cheap preflight: it reports whether the queue may need
// um_cli_rs. Known encrypted extensions answer immediately; only unlabeled .flac
// files are DeepProbed (to detect disguised kuwo), and their results are
// returned for runQueue to reuse. A cancelled ctx is returned as ctx.Err().
func (s *ConvertService) queueNeedsDecrypt(ctx context.Context, settings protocol.Settings, files []*FileEntry) (queuePreflight, error) {
	var result queuePreflight
	for _, f := range files {
		if playerForPath(f.Path) != "" {
			result.needDecrypt = true
			return result, nil
		}
	}
	var algorithms algoRegistry
	for _, f := range files {
		if !isUnlabeledFlac(f.Path) {
			continue
		}
		if algorithms.order == nil {
			algorithms = s.algoRegistry(ctx, &settings)
		}
		index, err := algorithms.resolveIndex(ctx, f.Path)
		if err != nil {
			if ctxErr := ctx.Err(); ctxErr != nil {
				return queuePreflight{}, ctxErr
			}
			// Leave the path uncached so runQueue reports the probe failure.
			continue
		}
		if result.claims == nil {
			result.claims = make(map[string]int)
		}
		result.claims[f.Path] = index
		if index >= 0 {
			result.needDecrypt = true
		}
	}
	return result, nil
}
